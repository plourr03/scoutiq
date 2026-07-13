import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 768;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: theme.colorScheme.surface,
        foregroundColor: theme.colorScheme.onSurface,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(isMobile ? 24 : 48),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 900),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Privacy Policy',
                  style: isMobile
                      ? theme.textTheme.displaySmall
                      : theme.textTheme.displayMedium,
                ),
                const SizedBox(height: 16),
                Text(
                  'Last Updated: January 27, 2026',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 32),
                _buildSection(
                  theme,
                  '1. Introduction',
                  'ScoutIQ LLC ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.',
                ),
                _buildSection(
                  theme,
                  '2. Information We Collect',
                  'We may collect information about you in a variety of ways, including:',
                  subsections: [
                    _buildSubsection(
                      theme,
                      'Personal Data',
                      'When you use our services, we may collect personally identifiable information such as your name, email address, phone number, and other contact information that you voluntarily provide.',
                    ),
                    _buildSubsection(
                      theme,
                      'Usage Data',
                      'We automatically collect certain information when you visit our website, including your IP address, browser type, operating system, access times, and the pages you have viewed.',
                    ),
                    _buildSubsection(
                      theme,
                      'Cookies and Tracking Technologies',
                      'We use cookies, web beacons, and other tracking technologies to enhance your experience, analyze trends, and administer the website.',
                    ),
                  ],
                ),
                _buildSection(
                  theme,
                  '3. How We Use Your Information',
                  'We use the information we collect to:',
                  bulletPoints: [
                    'Provide, operate, and maintain our services',
                    'Improve, personalize, and expand our services',
                    'Understand and analyze how you use our services',
                    'Develop new products, services, features, and functionality',
                    'Communicate with you for customer service, updates, and marketing',
                    'Process your transactions and manage your orders',
                    'Send you emails and notifications',
                    'Find and prevent fraud',
                    'Comply with legal obligations',
                  ],
                ),
                _buildSection(
                  theme,
                  '4. Sharing Your Information',
                  'We may share your information in the following circumstances:',
                  bulletPoints: [
                    'With service providers who perform services on our behalf',
                    'With business partners for joint offerings or promotions',
                    'In connection with a merger, sale, or acquisition',
                    'To comply with legal obligations or respond to legal requests',
                    'To protect our rights, privacy, safety, or property',
                    'With your consent or at your direction',
                  ],
                ),
                _buildSection(
                  theme,
                  '5. Data Security',
                  'We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.',
                ),
                _buildSection(
                  theme,
                  '6. Your Privacy Rights',
                  'Depending on your location, you may have certain rights regarding your personal information:',
                  bulletPoints: [
                    'Access: Request a copy of the personal information we hold about you',
                    'Correction: Request correction of inaccurate or incomplete information',
                    'Deletion: Request deletion of your personal information',
                    'Restriction: Request restriction of processing your information',
                    'Portability: Request transfer of your information to another service',
                    'Objection: Object to our processing of your information',
                    'Withdraw Consent: Withdraw consent where processing is based on consent',
                  ],
                ),
                _buildSection(
                  theme,
                  '7. Children\'s Privacy',
                  'Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.',
                ),
                _buildSection(
                  theme,
                  '8. Third-Party Links',
                  'Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.',
                ),
                _buildSection(
                  theme,
                  '9. International Data Transfers',
                  'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.',
                ),
                _buildSection(
                  theme,
                  '10. Data Retention',
                  'We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.',
                ),
                _buildSection(
                  theme,
                  '11. California Privacy Rights',
                  'If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, use, and share, and the right to request deletion of your personal information.',
                ),
                _buildSection(
                  theme,
                  '12. GDPR Compliance',
                  'If you are located in the European Economic Area (EEA), we comply with the General Data Protection Regulation (GDPR). We process your data lawfully based on consent, contract, legal obligation, or legitimate interests.',
                ),
                _buildSection(
                  theme,
                  '13. Changes to This Privacy Policy',
                  'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically.',
                ),
                _buildSection(
                  theme,
                  '14. Contact Us',
                  'If you have questions or concerns about this Privacy Policy, please contact us at:',
                  bulletPoints: [
                    'Email: scoutiq12@gmail.com',
                    'Website: www.scoutiq.com',
                  ],
                ),
                const SizedBox(height: 48),
                Center(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 16,
                      ),
                    ),
                    child: const Text('Back to Home'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(
    ThemeData theme,
    String title,
    String content, {
    List<Widget>? subsections,
    List<String>? bulletPoints,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            content,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.6,
              color: theme.colorScheme.onSurface.withOpacity(0.8),
            ),
          ),
          if (subsections != null) ...[
            const SizedBox(height: 16),
            ...subsections,
          ],
          if (bulletPoints != null) ...[
            const SizedBox(height: 12),
            ...bulletPoints.map((point) => Padding(
                  padding: const EdgeInsets.only(left: 24, bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '• ',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          point,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            height: 1.6,
                            color: theme.colorScheme.onSurface.withOpacity(0.8),
                          ),
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildSubsection(ThemeData theme, String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(left: 24, bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: theme.textTheme.bodyMedium?.copyWith(
              height: 1.6,
              color: theme.colorScheme.onSurface.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }
}
