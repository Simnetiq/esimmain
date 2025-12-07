import os
import stripe
import requests
import uuid
import re
import unicodedata
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

def sanitize_text(text):
    """Sanitize text to remove accents and special characters for Wise API"""
    if not text:
        return text
    
    # Convert to string and strip any whitespace
    text = str(text).strip()
    
    # Normalize unicode characters and remove accents
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    # Convert to ASCII to remove any remaining non-ASCII characters
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # Keep only alphanumeric characters and spaces (very restrictive for Wise)
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    
    # Remove multiple spaces and trim
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

app = Flask(__name__)
CORS(app, resources={r'/*': {'origins': '*'}})
# Stripe configuration
STRIPE_MODE = os.getenv('STRIPE_MODE', 'test')  # 'test' or 'live'
STRIPE_LIVE_KEY = os.getenv('STRIPE_LIVE_KEY')
STRIPE_TEST_KEY = os.getenv('STRIPE_TEST_KEY')

if STRIPE_MODE == 'live' and STRIPE_LIVE_KEY:
    stripe.api_key = STRIPE_LIVE_KEY
elif STRIPE_TEST_KEY:
    stripe.api_key = STRIPE_TEST_KEY
else:
    stripe.api_key = None

# Wise API configuration
WISE_API_TOKEN = 'ff9dbd3d-e3bf-401d-b82e-735027f62bbe'
WISE_MODE = 'live'  # 'sandbox' or 'live'
WISE_BASE_URL = 'https://api.sandbox.transferwise.tech' if WISE_MODE == 'sandbox' else 'https://api.wise.com'

def reload_stripe_api_key():
    global STRIPE_MODE, STRIPE_LIVE_KEY, STRIPE_TEST_KEY
    STRIPE_MODE = os.getenv('STRIPE_MODE', 'test')
    STRIPE_LIVE_KEY = os.getenv('STRIPE_LIVE_KEY')
    STRIPE_TEST_KEY = os.getenv('STRIPE_TEST_KEY')
    if STRIPE_MODE == 'live' and STRIPE_LIVE_KEY:
        stripe.api_key = STRIPE_LIVE_KEY
    elif STRIPE_TEST_KEY:
        stripe.api_key = STRIPE_TEST_KEY
    else:
        stripe.api_key = None

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "ok", "message": "Payment endpoint running"})

@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    try:
        data = request.json
        amount = data.get('amount')
        currency = data.get('currency', 'ils')
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            payment_method_types=['card'],
        )
        return jsonify({'clientSecret': payment_intent['client_secret']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    try:
        data = request.json
        order = data.get('order')
        email = data.get('email')
        total = data.get('total')
        name = data.get('name')
        currency = data.get('currency', 'usd').lower()
        domain = data.get('domain', 'https://shop.simnetiq.store')
        is_yearly = data.get('isYearly', False)
        if not currency or len(currency) != 3:
            currency = 'usd'
        domain = domain.rstrip('/')
        if is_yearly is not None:
            interval = 'year' if is_yearly else 'month'
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': currency,
                        'product_data': {
                            'name': f'Subscription Plan - {order}',
                            'description': f'{"Annual" if is_yearly else "Monthly"} subscription plan'
                        },
                        'unit_amount': int(float(total) * 100),
                        'recurring': {
                            'interval': interval,
                            'interval_count': 1
                        }
                    },
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=f'{domain}/subscription-success?session_id={{CHECKOUT_SESSION_ID}}&plan={order}',
                cancel_url=f'{domain}/subscriptions',
                customer_email=email,
                billing_address_collection='required',
                allow_promotion_codes=True,
                subscription_data={
                    'description': f'{"Annual" if is_yearly else "Monthly"} subscription for {email}',
                    'metadata': {
                        'order_id': order,
                        'plan_type': 'yearly' if is_yearly else 'monthly'
                    }
                }
            )
        else:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': currency,
                        'product_data': {
                            'name': f'Order {order}',
                        },
                        'unit_amount': int(float(total) * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=f'{domain}/payment-success?order={order}&email={email}&total={total}&name={name}&currency={currency}',
                cancel_url=f'{domain}/subscriptions',
                customer_email=email,
            )
        return jsonify({'sessionUrl': session.url, 'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-payment-order', methods=['POST'])
def create_payment_order():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    try:
        data = request.json
        order = data.get('order')
        email = data.get('email')
        name = data.get('name')
        total = data.get('total')
        currency = data.get('currency', 'usd').lower()
        domain = data.get('domain', 'https://shop.simnetiq.store')
        
        if not total:
            return jsonify({'error': 'Total amount is required'}), 400
        
        if not currency or len(currency) != 3:
            currency = 'usd'
        
        domain = domain.rstrip('/')
        
        # Create a Stripe Checkout Session for single order payment
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': f'Order {order}',
    
                    },
                    'unit_amount': int(float(total) * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{domain}/payment-success?order={order}&email={email}&total={total}&name={name}&currency={currency}',
            cancel_url=f'{domain}/esim-plans',
            customer_email=email,
            metadata={
                'order_id': order,
                'email': email,
                'name': name
            }
        )
        
        return jsonify({
            'sessionUrl': session.url,
            'sessionId': session.id,
            'total': total,
            'currency': currency,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/retrieve-session', methods=['POST'])
def retrieve_session():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        return jsonify({
            'customer_id': session.customer,
            'customer_email': session.customer_email,
            'payment_status': session.payment_status,
            'subscription_id': session.subscription,
            'amount_total': session.amount_total,
            'currency': session.currency,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/create-customer-portal-session', methods=['POST'])
def create_customer_portal_session():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    
        data = request.json
        customer_id = data.get('customer_id')
        return_url = data.get('return_url', 'https://shop.simnetiq.store/store-owner/settings')
        if not customer_id:
            return jsonify({'error': 'customer_id is required'}), 400
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        return jsonify({
            'url': session.url,
            'status': 'success'
        })
@app.route('/check-subscription-status', methods=['POST'])
def check_subscription_status():
    if not stripe.api_key:
        reload_stripe_api_key()
        if not stripe.api_key:
            return jsonify({'error': 'Stripe API key not configured. Please configure via environment variables'}), 503
    
    try:
        data = request.json
        customer_id = data.get('customer_id')
        
        if not customer_id:
            return jsonify({'error': 'customer_id is required'}), 400
        
        # Get customer's subscriptions from Stripe
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status='active',
            limit=10
        )
        
        has_active_subscription = len(subscriptions.data) > 0
        
        # Get details of the most recent active subscription
        subscription_details = {}
        if has_active_subscription:
            latest_sub = subscriptions.data[0]  # Most recent active subscription
            subscription_details = {
                'subscriptionId': latest_sub.id,
                'status': latest_sub.status,
                'planId': latest_sub.items.data[0].price.lookup_key if latest_sub.items.data else '',
                'planName': latest_sub.items.data[0].price.nickname if latest_sub.items.data else '',
                'currentPeriodStart': latest_sub.current_period_start,
                'currentPeriodEnd': latest_sub.current_period_end,
                'cancelAtPeriodEnd': latest_sub.cancel_at_period_end
            }
        
        return jsonify({
            'hasActiveSubscription': has_active_subscription,
            'subscriptionCount': len(subscriptions.data),
            'customerId': customer_id,
            'status': 'success',
            **subscription_details
        })
        
    except stripe.error.InvalidRequestError as e:
        return jsonify({'error': f'Invalid customer ID: {str(e)}'}), 400
    except stripe.error.StripeError as e:
        return jsonify({'error': f'Stripe error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

# Wise API Helper Functions
def wise_api_request(method, endpoint, data=None):
    """Make authenticated request to Wise API"""
    if not WISE_API_TOKEN:
        raise Exception('Wise API token not configured')
    
    headers = {
        'Authorization': f'Bearer {WISE_API_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    url = f'{WISE_BASE_URL}{endpoint}'
    
    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        response = requests.post(url, headers=headers, json=data)
    elif method == 'PUT':
        response = requests.put(url, headers=headers, json=data)
    elif method == 'DELETE':
        response = requests.delete(url, headers=headers)
    else:
        raise Exception(f'Unsupported HTTP method: {method}')
    
    if response.status_code >= 400:
        try:
            error_data = response.json()
            print(f"Wise API Error Response: {error_data}")  # Debug output
            error_msg = error_data.get('message', 'Unknown error')
            errors = error_data.get('errors', [])
            if errors:
                error_details = '; '.join([f"{e.get('code', 'ERROR')}: {e.get('message', 'No details')}" for e in errors])
                error_msg = f"{error_msg} - Details: {error_details}"
            raise Exception(f"Wise API Error: {error_msg}")
        except ValueError:
            print(f"Wise API Raw Error Response: {response.text}")  # Debug output
            raise Exception(f"Wise API Error: HTTP {response.status_code} - {response.text}")
    
    return response.json()

# Auth endpoint to check Wise API connection
@app.route('/wise/auth', methods=['GET'])
def check_wise_auth():
    """Check if Wise API is properly configured and accessible"""
    try:
        if not WISE_API_TOKEN:
            return jsonify({'error': 'Wise API token not configured'}), 401
        
        # Test API connection by fetching profiles
        profiles = wise_api_request('GET', '/v1/profiles')
        
        if not profiles:
            return jsonify({'error': 'No Wise profiles found'}), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Wise API connection successful',
            'profile_count': len(profiles),
            'mode': WISE_MODE
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/wise/withdrawal', methods=['POST'])
def create_withdrawal():
    """Single endpoint to create withdrawal with bank account details"""
    try:
        data = request.json
        print(f"Withdrawal request data: {data}")
        print(f"Using Wise API: {WISE_BASE_URL} (Mode: {WISE_MODE})")
        
        amount = data.get('amount')
        currency = data.get('currency', 'USD')
        bank_account = data.get('bank_account')
        store_id = data.get('store_id')
        reference = data.get('reference', f'Withdrawal {datetime.now().strftime("%Y%m%d-%H%M%S")}')
        
        print(f"Original reference: '{reference}'")
        print(f"Sanitized reference: '{sanitize_text(reference)}'")
        
        if not all([amount, bank_account, store_id]):
            return jsonify({'error': 'Missing required fields: amount, bank_account, store_id'}), 400
        
        # Validate bank account has required fields
        required_bank_fields = ['account_holder_name', 'currency', 'institution', 'transit', 'account_number', 'type']
        for field in required_bank_fields:
            if field not in bank_account:
                return jsonify({'error': f'Missing bank account field: {field}'}), 400
        
        # Additional validation based on bank account currency/country
        bank_currency = bank_account.get('currency', 'USD').upper()
        if bank_currency == 'CAD':
            # Validate Canadian format
            institution = bank_account['institution']
            transit = bank_account['transit']
            account_number = bank_account['account_number']
            
            print(f"Canadian validation - Institution: '{institution}', Transit: '{transit}', Account: '{account_number}'")
            
            if len(institution) != 3 or not institution.isdigit():
                return jsonify({'error': 'Institution number must be exactly 3 digits for Canadian accounts'}), 400
            
            if len(transit) != 5 or not transit.isdigit():
                return jsonify({'error': 'Transit number must be exactly 5 digits for Canadian accounts'}), 400
            
            if len(account_number) < 7 or len(account_number) > 12 or not account_number.isdigit():
                return jsonify({'error': 'Account number must be 7-12 digits for Canadian accounts'}), 400
        else:
            # Validate US format (default)
            routing_number = bank_account['transit']
            account_number = bank_account['account_number']
            
            if len(routing_number) != 9 or not routing_number.isdigit():
                return jsonify({'error': 'Routing number must be exactly 9 digits for US accounts'}), 400
            
            if len(account_number) < 4 or len(account_number) > 17 or not account_number.isdigit():
                return jsonify({'error': 'Account number must be 4-17 digits for US accounts'}), 400
        
        # Step 1: Get Wise profiles
        try:
            print(f"Step 1: Getting Wise profiles...")
            profiles = wise_api_request('GET', '/v1/profiles')
            if not profiles:
                raise Exception('No Wise profiles found')
            
            # Debug: Show all available profiles
            print(f"Available profiles: {profiles}")
            for i, profile in enumerate(profiles):
                profile_type = profile.get('type', 'unknown')
                profile_name = profile.get('details', {}).get('name', 'Unknown')
                print(f"Profile {i}: ID={profile['id']}, Type={profile_type}, Name={profile_name}")
            
            # Look for business profile first, fallback to first profile
            business_profile = None
            for profile in profiles:
                if profile.get('type') == 'business':
                    business_profile = profile
                    break
            
            if business_profile:
                profile_id = business_profile['id']
                print(f"Using BUSINESS profile ID: {profile_id}")
            else:
                profile_id = profiles[0]['id']  # Fallback to first profile
                print(f"No business profile found, using first profile ID: {profile_id}")
                
        except Exception as e:
            raise Exception(f"Step 1 failed (Get profiles): {str(e)}")
        
        # Step 2: Create recipient account
        # Format data based on bank account currency/country
        bank_currency = bank_account.get('currency', 'USD').upper()
        if bank_currency == 'CAD':
            # Canadian format
            recipient_data = {
                'profile': profile_id,
                'accountHolderName': sanitize_text(bank_account['account_holder_name']),
                'currency': bank_currency,
                'country': 'CA',
                'type': 'canadian',
                'details': {
                    'legalType': 'PRIVATE',
                    'institutionNumber': bank_account['institution'],  # 3 digits
                    'transitNumber': bank_account['transit'],          # 5 digits
                    'accountNumber': bank_account['account_number'],   # 7-12 digits
                    'accountType': bank_account['type'].upper(),       # CHECKING or SAVING
                    'address': {
                        'country': 'CA',
                        'state': 'ON',  # Added required state/province field
                        'city': 'Toronto',
                        'firstLine': '123 Front St',
                        'postCode': 'M5J2N1'
                    }
                }
            }
        else:
            # US format (default)
            recipient_data = {
                'profile': profile_id,
                'accountHolderName': sanitize_text(bank_account['account_holder_name']),
                'currency': bank_currency,
                'country': 'US',
                'type': 'aba',
                'details': {
                    'legalType': 'PRIVATE',
                    'abartn': bank_account['transit'],  # Routing number - should be 9 digits
                    'accountNumber': bank_account['account_number'],
                    'accountType': bank_account['type'].upper(),
                    'address': {
                        'country': 'US',
                        'state': 'NY',  # Added required state field
                        'city': 'New York',
                        'postCode': '10001',
                        'firstLine': '123 Main St'
                    }
                }
            }
        
        try:
            original_name = bank_account['account_holder_name']
            sanitized_name = sanitize_text(original_name)
            print(f"Original account holder name: '{original_name}' (bytes: {original_name.encode('utf-8')})")
            print(f"Sanitized account holder name: '{sanitized_name}' (bytes: {sanitized_name.encode('utf-8')})")
            print(f"Step 2: Creating recipient with data: {recipient_data}")
            recipient = wise_api_request('POST', '/v1/accounts', recipient_data)
            print(f"Recipient created: {recipient}")
        except Exception as e:
            raise Exception(f"Step 2 failed (Create recipient): {str(e)}")
        
        # Step 3: Create quote
        quote_data = {
            'profile': profile_id,
            'source': currency.upper(),  # Store currency (e.g., USD)
            'target': bank_currency,     # Bank account currency (e.g., CAD)
            'rateType': 'FIXED',
            'sourceAmount': float(amount),  # Changed from targetAmount to sourceAmount
            'type': 'BALANCE_PAYOUT'
        }
        
        try:
            print(f"Step 3: Creating quote with data: {quote_data}")
            quote = wise_api_request('POST', '/v1/quotes', quote_data)
            print(f"Quote created: {quote}")
        except Exception as e:
            raise Exception(f"Step 3 failed (Create quote): {str(e)}")
        
        # Step 4: Create transfer
        transfer_data = {
            'targetAccount': recipient['id'],
            'quote': quote['id'],
            'customerTransactionId': str(uuid.uuid4()),
            'details': {
                'reference': sanitize_text(reference),
                'transferPurpose': 'VERIFICATION.TRANSFERS.PURPOSE.PAY.BILLS',
                'sourceOfFunds': 'VERIFICATION.SOURCE_OF_FUNDS.OTHER'
            }
        }
        
        try:
            print(f"Step 4: Creating transfer with data: {transfer_data}")
            transfer = wise_api_request('POST', '/v1/transfers', transfer_data)
            print(f"Transfer created: {transfer}")
        except Exception as e:
            raise Exception(f"Step 4 failed (Create transfer): {str(e)}")
        
        # Step 5: Fund transfer
        fund_data = {
            'type': 'BALANCE'
        }
        
        # Step 5: Fund transfer (optional - some APIs auto-fund)
        fund_result = None
        try:
            print(f"Step 5: Funding transfer {transfer['id']} with data: {fund_data}")
            # Try the correct funding endpoint for live API
            fund_result = wise_api_request('POST', f'/v1/transfers/{transfer["id"]}/payments', fund_data)
            print(f"Fund result: {fund_result}")
        except Exception as e:
            print(f"Step 5 warning: Funding failed with v1 endpoint: {str(e)}")
            # If v1 fails, try v3 as fallback
            try:
                print(f"Step 5 (fallback): Trying v3 endpoint...")
                fund_result = wise_api_request('POST', f'/v3/transfers/{transfer["id"]}/payments', fund_data)
                print(f"Fund result (v3): {fund_result}")
            except Exception as e2:
                print(f"Step 5 warning: Funding also failed with v3 endpoint: {str(e2)}")
                print("Transfer created successfully, but funding failed. Transfer may be auto-funded or require manual approval.")
                # Don't raise exception - transfer might still work
        
        # Return success response with transfer details
        return jsonify({
            'transfer': transfer,
            'recipient': recipient,
            'quote': quote,
            'fund_result': fund_result,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
