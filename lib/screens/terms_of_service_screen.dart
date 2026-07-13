import 'package:flutter/material.dart';

class TermsOfServiceScreen extends StatelessWidget {
  const TermsOfServiceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 768;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Terms of Service'),
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
                  'Terms of Service',
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
                  '1. Acceptance of Terms',
                  'By accessing or using ScoutIQ LLC\'s website and services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Services. We reserve the right to modify these Terms at any time, and your continued use of the Services constitutes acceptance of any changes.',
                ),
                _buildSection(
                  theme,
                  '2. Description of Services',
                  'ScoutIQ LLC provides innovative technology solutions including game night management platforms, sports analytics publications, and professional consulting services. Our Services are subject to change or discontinuation at any time without notice.',
                ),
                _buildSection(
                  theme,
                  '3. User Accounts',
                  'To access certain features of our Services, you may be required to create an account. You agree to:',
                  bulletPoints: [
                    'Provide accurate, current, and complete information',
                    'Maintain and promptly update your account information',
                    'Maintain the security of your password and account',
                    'Accept responsibility for all activities under your account',
                    'Notify us immediately of any unauthorized access or security breach',
                    'Be at least 13 years of age to create an account',
                  ],
                ),
                _buildSection(
                  theme,
                  '4. User Conduct',
                  'You agree not to use the Services to:',
                  bulletPoints: [
                    'Violate any applicable laws or regulations',
                    'Infringe upon intellectual property rights',
                    'Transmit harmful, offensive, or inappropriate content',
                    'Harass, abuse, or harm other users',
                    'Attempt to gain unauthorized access to our systems',
                    'Interfere with or disrupt the Services',
                    'Use automated systems to access the Services without permission',
                    'Collect or harvest information about other users',
                    'Impersonate any person or entity',
                    'Engage in fraudulent activities',
                  ],
                ),
                _buildSection(
                  theme,
                  '5. Intellectual Property Rights',
                  'All content, features, and functionality of the Services, including but not limited to text, graphics, logos, icons, images, audio clips, video clips, data compilations, and software, are the exclusive property of ScoutIQ LLC and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.',
                ),
                _buildSection(
                  theme,
                  '6. User-Generated Content',
                  'You retain ownership of any content you submit, post, or display through the Services. By submitting content, you grant ScoutIQ LLC a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content. You represent and warrant that you have all necessary rights to grant this license.',
                ),
                _buildSection(
                  theme,
                  '7. Payment and Billing',
                  'If you purchase any services or products through ScoutIQ LLC:',
                  bulletPoints: [
                    'You agree to pay all fees and charges at the prices then in effect',
                    'All fees are non-refundable unless otherwise stated',
                    'You authorize us to charge your payment method for all fees',
                    'You are responsible for all taxes associated with your purchase',
                    'We reserve the right to change our pricing at any time',
                    'Failure to pay may result in suspension or termination of services',
                  ],
                ),
                _buildSection(
                  theme,
                  '8. Privacy and Data Protection',
                  'Your use of the Services is also governed by our Privacy Policy. We collect, use, and protect your personal information in accordance with applicable data protection laws, including GDPR and CCPA.',
                ),
                _buildSection(
                  theme,
                  '9. Third-Party Services and Links',
                  'Our Services may contain links to third-party websites or services. We are not responsible for the content, accuracy, or practices of these external sites. Your interactions with third-party services are solely between you and the third party.',
                ),
                _buildSection(
                  theme,
                  '10. Disclaimers and Limitation of Liability',
                  'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. SCOUTIQ LLC DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW, SCOUTIQ LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.',
                ),
                _buildSection(
                  theme,
                  '11. Indemnification',
                  'You agree to defend, indemnify, and hold harmless ScoutIQ LLC, its affiliates, and their respective officers, directors, employees, and agents from any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys\' fees) arising out of or related to your use of the Services, violation of these Terms, or infringement of any rights of another party.',
                ),
                _buildSection(
                  theme,
                  '12. Termination',
                  'We reserve the right to suspend or terminate your access to the Services at any time, with or without cause, and with or without notice. Upon termination, your right to use the Services will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.',
                ),
                _buildSection(
                  theme,
                  '13. Dispute Resolution and Arbitration',
                  'Any dispute arising out of or relating to these Terms or the Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall take place in the jurisdiction where ScoutIQ is headquartered. You waive any right to participate in a class action lawsuit or class-wide arbitration.',
                ),
                _buildSection(
                  theme,
                  '14. Governing Law',
                  'These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ScoutIQ LLC is registered, without regard to its conflict of law provisions.',
                ),
                _buildSection(
                  theme,
                  '15. Changes to Services',
                  'We reserve the right to modify, suspend, or discontinue any part of the Services at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Services.',
                ),
                _buildSection(
                  theme,
                  '16. Severability',
                  'If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
                ),
                _buildSection(
                  theme,
                  '17. Entire Agreement',
                  'These Terms, together with our Privacy Policy and any other legal notices published by us, constitute the entire agreement between you and ScoutIQ LLC regarding the Services.',
                ),
                _buildSection(
                  theme,
                  '18. Contact Information',
                  'If you have any questions about these Terms, please contact us at:',
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
}
