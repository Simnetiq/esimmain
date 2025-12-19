import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from 'heroui-native';

/**
 * Extracted header component for [planId].js
 * Displays country flag with fallbacks and country name.
 */
const PlanHeader = ({ country, isDark, colors, formattedData }) => {
    if (!country) return null;

    return (
        <Card style={[
            styles.countryHeader,
            {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                borderWidth: 1,
            },
            styles.cardShadow
        ]}>
            <View style={styles.countryInfo}>
                <View style={[styles.flagContainer, { backgroundColor: colors.input }]}>
                    <Image
                        source={{
                            uri: country.photo || country.image || country.flag_url || `https://flagcdn.com/w160/${(country.code || country.iso_code || '').toLowerCase()}.png`
                        }}
                        style={styles.flagImage}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.countryTextContainer}>
                    <Text style={[styles.countryName, { color: colors.text }]}>
                        {country.displayName || country.name || country.country_name || 'Destination'}
                    </Text>
                    <Text style={[styles.planSubtitle, { color: colors.textSecondary }]}>
                        {formattedData}
                    </Text>
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    countryHeader: {
        padding: 16,
        borderRadius: 24,
        marginBottom: 16,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    countryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    flagContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
    },
    flagImage: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
    },
    countryTextContainer: {
        flex: 1,
    },
    countryName: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    planSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
});

export default PlanHeader;
