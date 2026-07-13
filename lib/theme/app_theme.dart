import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Color palette
  static const Color primaryColor = Color(0xFF2563EB); // Modern blue
  static const Color secondaryColor = Color(0xFF10B981); // Accent green
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color lightBackground = Color(0xFFFAFAFA);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color accentOrange = Color(0xFFF59E0B);
  static const Color accentPurple = Color(0xFF8B5CF6);

  // Light Theme
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: primaryColor,
      secondary: secondaryColor,
      surface: lightSurface,
      error: const Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: const Color(0xFF1E293B),
    ),
    scaffoldBackgroundColor: lightBackground,
    textTheme: GoogleFonts.interTextTheme(
      ThemeData.light().textTheme.copyWith(
            displayLarge: GoogleFonts.inter(
              fontSize: 72,
              fontWeight: FontWeight.w800,
              letterSpacing: -2,
              height: 1.1,
            ),
            displayMedium: GoogleFonts.inter(
              fontSize: 56,
              fontWeight: FontWeight.w700,
              letterSpacing: -1.5,
              height: 1.2,
            ),
            displaySmall: GoogleFonts.inter(
              fontSize: 40,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
              height: 1.3,
            ),
            headlineLarge: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.w600,
              height: 1.3,
            ),
            headlineMedium: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
            headlineSmall: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
            titleLarge: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
            titleMedium: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
            titleSmall: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
            bodyLarge: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w400,
              height: 1.6,
            ),
            bodyMedium: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              height: 1.6,
            ),
            bodySmall: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              height: 1.5,
            ),
            labelLarge: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
            ),
          ),
    ),
    cardTheme: const CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
      color: lightSurface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );

  // Dark Theme
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: ColorScheme.dark(
      primary: primaryColor,
      secondary: secondaryColor,
      surface: darkSurface,
      error: const Color(0xFFEF4444),
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: const Color(0xFFF1F5F9),
    ),
    scaffoldBackgroundColor: darkBackground,
    textTheme: GoogleFonts.interTextTheme(
      ThemeData.dark().textTheme.copyWith(
            displayLarge: GoogleFonts.inter(
              fontSize: 72,
              fontWeight: FontWeight.w800,
              letterSpacing: -2,
              height: 1.1,
              color: const Color(0xFFF1F5F9),
            ),
            displayMedium: GoogleFonts.inter(
              fontSize: 56,
              fontWeight: FontWeight.w700,
              letterSpacing: -1.5,
              height: 1.2,
              color: const Color(0xFFF1F5F9),
            ),
            displaySmall: GoogleFonts.inter(
              fontSize: 40,
              fontWeight: FontWeight.w600,
              letterSpacing: -0.5,
              height: 1.3,
              color: const Color(0xFFF1F5F9),
            ),
            headlineLarge: GoogleFonts.inter(
              fontSize: 32,
              fontWeight: FontWeight.w600,
              height: 1.3,
              color: const Color(0xFFF1F5F9),
            ),
            headlineMedium: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w600,
              height: 1.4,
              color: const Color(0xFFF1F5F9),
            ),
            headlineSmall: GoogleFonts.inter(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              height: 1.4,
              color: const Color(0xFFF1F5F9),
            ),
            titleLarge: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w500,
              height: 1.5,
              color: const Color(0xFFF1F5F9),
            ),
            titleMedium: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w500,
              height: 1.5,
              color: const Color(0xFFF1F5F9),
            ),
            titleSmall: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              height: 1.5,
              color: const Color(0xFFF1F5F9),
            ),
            bodyLarge: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w400,
              height: 1.6,
              color: const Color(0xFFCBD5E1),
            ),
            bodyMedium: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              height: 1.6,
              color: const Color(0xFFCBD5E1),
            ),
            bodySmall: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              height: 1.5,
              color: const Color(0xFFCBD5E1),
            ),
            labelLarge: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
              color: const Color(0xFFF1F5F9),
            ),
          ),
    ),
    cardTheme: const CardThemeData(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(16)),
      ),
      color: darkSurface,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );
}
