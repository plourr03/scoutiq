import 'package:flutter/material.dart';

class AboutSection extends StatelessWidget {
  const AboutSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 768;
    final isTablet = size.width >= 768 && size.width < 1024;

    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : (isTablet ? 48 : 80),
        vertical: isMobile ? 80 : 120,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1200),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Section title
              Text(
                'About ScoutIQ',
                style: isMobile
                    ? theme.textTheme.displaySmall
                    : theme.textTheme.displayMedium,
                textAlign: TextAlign.center,
              ),
              SizedBox(height: isMobile ? 24 : 32),
              // Divider
              Container(
                width: 80,
                height: 4,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primary,
                      theme.colorScheme.secondary,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              SizedBox(height: isMobile ? 32 : 48),
              // Main description
              Text(
                'ScoutIQ is an innovation hub dedicated to creating intelligent, user-centric solutions that solve real-world problems.',
                style: isMobile
                    ? theme.textTheme.titleLarge
                    : theme.textTheme.headlineSmall,
                textAlign: TextAlign.center,
              ),
              SizedBox(height: isMobile ? 24 : 32),
              // Secondary description
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 800),
                child: Text(
                  'We believe in the power of technology to transform everyday experiences. From organizing game nights to breaking down NBA analytics to solving hard problems for businesses, our products are designed with a focus on exceptional user experience and tangible value.',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              SizedBox(height: isMobile ? 48 : 64),
              // Mission cards
              Wrap(
                spacing: isMobile ? 16 : 32,
                runSpacing: isMobile ? 16 : 32,
                alignment: WrapAlignment.center,
                children: [
                  _MissionCard(
                    icon: Icons.lightbulb_outline,
                    title: 'Innovation',
                    description:
                        'Transforming creative ideas into practical solutions',
                    color: theme.colorScheme.primary,
                    isMobile: isMobile,
                  ),
                  _MissionCard(
                    icon: Icons.people_outline,
                    title: 'User-Centric',
                    description:
                        'Designing with people at the heart of everything',
                    color: theme.colorScheme.secondary,
                    isMobile: isMobile,
                  ),
                  _MissionCard(
                    icon: Icons.auto_graph,
                    title: 'Data-Driven',
                    description:
                        'Leveraging analytics for smarter decision-making',
                    color: const Color(0xFFF59E0B),
                    isMobile: isMobile,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MissionCard extends StatefulWidget {
  final IconData icon;
  final String title;
  final String description;
  final Color color;
  final bool isMobile;

  const _MissionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
    required this.isMobile,
  });

  @override
  State<_MissionCard> createState() => _MissionCardState();
}

class _MissionCardState extends State<_MissionCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cardWidth = widget.isMobile ? double.infinity : 280.0;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: cardWidth,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _isHovered
                ? widget.color.withOpacity(0.5)
                : theme.colorScheme.onSurface.withOpacity(0.1),
            width: 2,
          ),
          boxShadow: _isHovered
              ? [
                  BoxShadow(
                    color: widget.color.withOpacity(0.2),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ]
              : [],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: widget.color.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                widget.icon,
                size: 40,
                color: widget.color,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              widget.title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              widget.description,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withOpacity(0.7),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
