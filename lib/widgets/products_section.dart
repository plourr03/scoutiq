import 'package:flutter/material.dart';
import '../models/product.dart';
import 'product_card.dart';

class ProductsSection extends StatelessWidget {
  const ProductsSection({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final size = MediaQuery.of(context).size;
    final isMobile = size.width < 768;
    final isTablet = size.width >= 768 && size.width < 1024;
    final products = Product.getAllProducts();

    return Container(
      width: double.infinity,
      color: theme.brightness == Brightness.dark
          ? const Color(0xFF1E293B)
          : const Color(0xFFF8FAFC),
      padding: EdgeInsets.symmetric(
        horizontal: isMobile ? 24 : (isTablet ? 48 : 80),
        vertical: isMobile ? 80 : 120,
      ),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1400),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Section title
              Text(
                'Our Products',
                style: isMobile
                    ? theme.textTheme.displaySmall
                    : theme.textTheme.displayMedium,
                textAlign: TextAlign.center,
              ),
              SizedBox(height: isMobile ? 16 : 24),
              // Subtitle
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 700),
                child: Text(
                  'Live products and services — from NBA analytics to game night management to hands-on consulting',
                  style: theme.textTheme.bodyLarge?.copyWith(
                    color: theme.colorScheme.onSurface.withOpacity(0.7),
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              SizedBox(height: isMobile ? 48 : 64),
              // Product cards
              if (isMobile)
                // Mobile: Single column
                Column(
                  children: products.map((product) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: ProductCard(
                        product: product,
                        isMobile: isMobile,
                      ),
                    );
                  }).toList(),
                )
              else if (isTablet)
                // Tablet: 2 columns
                Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: ProductCard(
                            product: products[0],
                            isMobile: false,
                          ),
                        ),
                        const SizedBox(width: 24),
                        Expanded(
                          child: ProductCard(
                            product: products[1],
                            isMobile: false,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: ProductCard(
                            product: products[2],
                            isMobile: false,
                          ),
                        ),
                        const SizedBox(width: 24),
                        const Expanded(child: SizedBox()),
                      ],
                    ),
                  ],
                )
              else
                // Desktop: 3 columns
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: products.map((product) {
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: ProductCard(
                          product: product,
                          isMobile: false,
                        ),
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
