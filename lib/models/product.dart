import 'package:flutter/material.dart';

class Product {
  final String name;
  final String tagline;
  final String description;
  final List<String> features;
  final IconData icon;
  final Color color;
  final String ctaLabel;
  final String ctaUrl;
  final IconData ctaIcon;

  Product({
    required this.name,
    required this.tagline,
    required this.description,
    required this.features,
    required this.icon,
    required this.color,
    required this.ctaLabel,
    required this.ctaUrl,
    required this.ctaIcon,
  });

  static List<Product> getAllProducts() {
    return [
      Product(
        name: 'Wolves to a T',
        tagline: 'Timberwolves Analytics, Decoded',
        description:
            'A data-driven publication covering the Minnesota Timberwolves, turning box scores and tracking data into analysis you can actually use.',
        features: [
          'Advanced stat breakdowns of every game',
          'Player development and usage trends',
          'Lineup and rotation analysis',
          'Trade, roster, and draft deep dives',
          'Charts and visuals that tell the story',
        ],
        icon: Icons.query_stats,
        color: const Color(0xFF3B82F6), // Blue
        ctaLabel: 'Read the Latest',
        ctaUrl: 'https://wolvestoat.com/',
        ctaIcon: Icons.open_in_new,
      ),
      Product(
        name: 'Settlers After Dark',
        tagline: 'Elevate Your Game Nights',
        description:
            'An all-in-one board game night management platform that handles the planning, the scorekeeping, and the bragging rights.',
        features: [
          'Create and schedule game nights',
          'Log results across every game you play',
          'Rankings, leaderboards, and player stats',
          'Invites, RSVPs, and reminders',
          'A shared history of every night you host',
        ],
        icon: Icons.casino_outlined,
        color: const Color(0xFF8B5CF6), // Purple
        ctaLabel: 'Visit the App',
        ctaUrl: 'https://settlers-after-dark.com/',
        ctaIcon: Icons.open_in_new,
      ),
      Product(
        name: 'Consulting',
        tagline: 'Expert Solutions for Your Business',
        description:
            'Professional consulting services that help businesses optimize operations, implement technology solutions, and achieve strategic goals.',
        features: [
          'Strategic planning and execution',
          'Technology implementation and integration',
          'Process optimization and automation',
          'Data analysis and business intelligence',
          'Custom solution development',
        ],
        icon: Icons.business_center_outlined,
        color: const Color(0xFFF59E0B), // Orange
        ctaLabel: 'Email Us',
        ctaUrl: 'mailto:scoutiq12@gmail.com?subject=Consulting%20Inquiry',
        ctaIcon: Icons.email_outlined,
      ),
    ];
  }
}
