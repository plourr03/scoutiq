import 'package:flutter/material.dart';
import 'dart:math';

class HeroSection extends StatefulWidget {
  final VoidCallback onExplorePressed;
  
  const HeroSection({super.key, required this.onExplorePressed});

  @override
  State<HeroSection> createState() => _HeroSectionState();
}

class _HeroSectionState extends State<HeroSection>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late AnimationController _floatingController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    );

    _floatingController = AnimationController(
      duration: const Duration(seconds: 20),
      vsync: this,
    )..repeat();

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
      ),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.2, 0.8, curve: Curves.easeOut),
      ),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    _floatingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 768;

    return Container(
      height: size.height * 0.95,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  const Color(0xFF0F172A),
                  const Color(0xFF1E293B),
                  const Color(0xFF0F172A),
                ]
              : [
                  const Color(0xFFFAFAFA),
                  const Color(0xFFF1F5F9),
                  const Color(0xFFFFFFFF),
                ],
        ),
      ),
      child: Stack(
        children: [
          // Animated floating background circles with larger movement
          AnimatedBuilder(
            animation: _floatingController,
            builder: (context, child) {
              return Positioned(
                top: size.height * 0.1 + (sin(_floatingController.value * 2 * pi) * size.height * 0.3),
                right: size.width * 0.1 + (cos(_floatingController.value * 2 * pi) * size.width * 0.2),
                child: Opacity(
                  opacity: 0.05 * _fadeAnimation.value,
                  child: Container(
                    width: 400,
                    height: 400,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              );
            },
          ),
          AnimatedBuilder(
            animation: _floatingController,
            builder: (context, child) {
              return Positioned(
                bottom: size.height * 0.05 + (cos(_floatingController.value * 2 * pi + 1.5) * size.height * 0.35),
                left: size.width * 0.05 + (sin(_floatingController.value * 2 * pi + 1.5) * size.width * 0.25),
                child: Opacity(
                  opacity: 0.03 * _fadeAnimation.value,
                  child: Container(
                    width: 500,
                    height: 500,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: theme.colorScheme.secondary,
                    ),
                  ),
                ),
              );
            },
          ),
          AnimatedBuilder(
            animation: _floatingController,
            builder: (context, child) {
              return Positioned(
                top: size.height * 0.4 + (sin(_floatingController.value * 2 * pi + 3) * size.height * 0.25),
                left: size.width * 0.2 + (cos(_floatingController.value * 2 * pi + 3) * size.width * 0.3),
                child: Opacity(
                  opacity: 0.04 * _fadeAnimation.value,
                  child: Container(
                    width: 350,
                    height: 350,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF8B5CF6),
                    ),
                  ),
                ),
              );
            },
          ),
          // Main content
          Center(
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: isMobile ? 24 : 48,
                vertical: 48,
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  FadeTransition(
                    opacity: _fadeAnimation,
                    child: Image.asset(
                      isDark
                          ? 'assets/images/scoutiq-logo-dark-mode.png'
                          : 'assets/images/scoutiq-logo-light-mode.png',
                      height: isMobile ? 80 : 120,
                      fit: BoxFit.contain,
                    ),
                  ),
                  SizedBox(height: isMobile ? 32 : 48),
                  // Tagline
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: Text(
                        'Transforming Ideas into\nIntelligent Solutions',
                        style: isMobile
                            ? theme.textTheme.displaySmall
                            : theme.textTheme.displayMedium,
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                  SizedBox(height: isMobile ? 20 : 32),
                  // Subtitle
                  SlideTransition(
                    position: _slideAnimation,
                    child: FadeTransition(
                      opacity: _fadeAnimation,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 700),
                        child: Text(
                          'Building innovative platforms that empower people to organize, analyze, and optimize their daily lives.',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withOpacity(0.7),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: isMobile ? 48 : 64),
                  // CTA Button
                  FadeTransition(
                    opacity: _fadeAnimation,
                    child: ElevatedButton(
                      onPressed: widget.onExplorePressed,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: theme.colorScheme.primary,
                        foregroundColor: Colors.white,
                        padding: EdgeInsets.symmetric(
                          horizontal: isMobile ? 32 : 48,
                          vertical: isMobile ? 18 : 24,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Explore Our Products',
                            style: TextStyle(
                              fontSize: isMobile ? 16 : 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward, size: 20),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Scroll indicator
          Positioned(
            bottom: 32,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: [
                  Text(
                    'Scroll to explore',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color:
                          theme.colorScheme.onSurface.withOpacity(0.5),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Icon(
                    Icons.keyboard_arrow_down,
                    color: theme.colorScheme.onSurface.withOpacity(0.5),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
