import { PKPass } from 'passkit-generator';
import path from 'path';
import fs from 'fs';

/**
 * Format date for pass display
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format time for pass display
 * @param {Date|string} date
 * @returns {string}
 */
function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get certificate configuration for passkit-generator
 * @returns {Object} Certificate configuration
 */
function getCertificates() {
  const certsDir = process.env.PASS_CERTS_PATH || path.resolve(process.cwd(), 'certs');

  return {
    wwdr: fs.readFileSync(path.join(certsDir, 'wwdr.pem')),
    signerCert: fs.readFileSync(path.join(certsDir, 'pass-cert.pem')),
    signerKey: fs.readFileSync(path.join(certsDir, 'pass-key.pem')),
    signerKeyPassphrase: process.env.PASS_KEY_PASSWORD || ''
  };
}

/**
 * Generate an Apple Wallet event pass
 * @param {Object} event - Event data
 * @param {string} event.id - Event ID
 * @param {string} event.title - Event title
 * @param {string} event.start_time - Event start time (ISO string)
 * @param {string} event.location_name - Location name
 * @param {number} event.distance_km - Event distance in km
 * @param {number} [event.location_lat] - Location latitude
 * @param {number} [event.location_lng] - Location longitude
 * @param {string} [event.organizer_name] - Organizer name
 * @param {Object} user - User data
 * @param {string} user.id - User ID
 * @param {string} [user.name] - User name
 * @returns {Promise<Buffer>} The .pkpass file as a buffer
 */
export async function generateEventPass(event, user) {
  const templatePath = process.env.PASS_TEMPLATE_PATH ||
    path.resolve(process.cwd(), 'pass-templates', 'event');

  // Validate required environment variables
  if (!process.env.APPLE_TEAM_ID) {
    throw new Error('APPLE_TEAM_ID environment variable is required');
  }
  if (!process.env.PASS_TYPE_IDENTIFIER) {
    throw new Error('PASS_TYPE_IDENTIFIER environment variable is required');
  }

  const certificates = getCertificates();

  const pass = await PKPass.from(
    {
      model: templatePath,
      certificates
    },
    {
      serialNumber: `event-${event.id}-user-${user.id}`,
      passTypeIdentifier: process.env.PASS_TYPE_IDENTIFIER,
      teamIdentifier: process.env.APPLE_TEAM_ID,
      description: 'Running Event Pass',
      organizationName: 'FoundMiles',
      logoText: 'FoundMiles',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(0, 0, 0)',
      labelColor: 'rgb(155, 155, 155)'
    }
  );

  // Set pass type to eventTicket
  pass.type = 'eventTicket';

  // Primary fields - Event name
  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: event.title
  });

  // Secondary fields - Date and time
  pass.secondaryFields.push(
    {
      key: 'date',
      label: 'DATE',
      value: formatDate(event.start_time)
    },
    {
      key: 'time',
      label: 'TIME',
      value: formatTime(event.start_time)
    }
  );

  // Auxiliary fields - Location and distance
  pass.auxiliaryFields.push(
    {
      key: 'location',
      label: 'LOCATION',
      value: event.location_name || 'TBA'
    },
    {
      key: 'distance',
      label: 'DISTANCE',
      value: event.distance_km ? `${event.distance_km} km` : 'TBA'
    }
  );

  // Back fields - Additional info
  if (event.organizer_name) {
    pass.backFields.push({
      key: 'organizer',
      label: 'ORGANIZED BY',
      value: event.organizer_name
    });
  }

  pass.backFields.push(
    {
      key: 'instructions',
      label: 'CHECK-IN',
      value: 'Show this pass at the registration desk 30 minutes before the event starts.'
    },
    {
      key: 'contact',
      label: 'CONTACT',
      value: 'support@foundmiles.com'
    }
  );

  // Add QR code for check-in
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: `FOUNDMILES-${event.id}-${user.id}`,
    messageEncoding: 'iso-8859-1'
  });

  // Add location-based notification if coordinates are available
  if (event.location_lat && event.location_lng) {
    pass.setLocations([
      {
        latitude: event.location_lat,
        longitude: event.location_lng,
        relevantText: "You're near the starting point!"
      }
    ]);
  }

  // Set relevant date for lock screen notification
  if (event.start_time) {
    pass.setRelevantDate(new Date(event.start_time));
  }

  // Set expiration date (event end time or 5 hours after start)
  if (event.end_time) {
    pass.setExpirationDate(new Date(event.end_time));
  } else if (event.start_time) {
    const expiration = new Date(event.start_time);
    expiration.setHours(expiration.getHours() + 5);
    pass.setExpirationDate(expiration);
  }

  // Generate and return the pass buffer
  return pass.getAsBuffer();
}

/**
 * Validate that all required certificates and templates exist
 * @returns {Object} Validation result with success flag and any errors
 */
export function validatePassConfiguration() {
  const errors = [];

  // Check environment variables
  if (!process.env.APPLE_TEAM_ID) {
    errors.push('Missing APPLE_TEAM_ID environment variable');
  }
  if (!process.env.PASS_TYPE_IDENTIFIER) {
    errors.push('Missing PASS_TYPE_IDENTIFIER environment variable');
  }

  // Check certificate files
  const certsDir = process.env.PASS_CERTS_PATH || path.resolve(process.cwd(), 'certs');
  const requiredCerts = ['wwdr.pem', 'pass-cert.pem', 'pass-key.pem'];

  for (const cert of requiredCerts) {
    const certPath = path.join(certsDir, cert);
    if (!fs.existsSync(certPath)) {
      errors.push(`Missing certificate file: ${certPath}`);
    }
  }

  // Check template directory
  const templatePath = process.env.PASS_TEMPLATE_PATH ||
    path.resolve(process.cwd(), 'pass-templates', 'event');

  if (!fs.existsSync(templatePath)) {
    errors.push(`Missing pass template directory: ${templatePath}`);
  } else {
    // Check for required images
    const requiredImages = ['icon.png', 'icon@2x.png'];
    for (const img of requiredImages) {
      const imgPath = path.join(templatePath, img);
      if (!fs.existsSync(imgPath)) {
        errors.push(`Missing required image: ${imgPath}`);
      }
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export default { generateEventPass, validatePassConfiguration };
