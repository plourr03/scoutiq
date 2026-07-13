# ScoutIQ LLC

**Transforming Ideas into Intelligent Solutions**

ScoutIQ LLC is an innovation hub dedicated to creating intelligent, user-centric platforms that solve real-world problems. This repository contains the official ScoutIQ company website built with Flutter Web.

## About ScoutIQ LLC

ScoutIQ LLC serves as an umbrella company for multiple innovative product ideas:

### Our Products

1. **[Wolves to a T](https://wolvestoat.com/)** - Analytics publication covering the Minnesota Timberwolves
   - Advanced stat breakdowns of every game
   - Player development and usage trends
   - Lineup and rotation analysis
   - Trade, roster, and draft deep dives

2. **[Settlers After Dark](https://settlers-after-dark.com/)** - All-in-one board game night management platform
   - Create and schedule game nights
   - Log results across every game you play
   - Rankings, leaderboards, and player stats
   - Invites, RSVPs, and reminders

3. **Consulting** - Professional business consulting services (contact scoutiq12@gmail.com)
   - Strategic planning and execution
   - Technology implementation and integration
   - Process optimization and automation
   - Data analysis and business intelligence

## Tech Stack

- **Framework**: Flutter Web 3.38.6
- **Design System**: Material Design 3
- **Typography**: Google Fonts (Inter)
- **Responsive**: Mobile, tablet, and desktop optimized

## Features

- Modern, minimalistic design
- Smooth animations and micro-interactions
- Light and dark theme support (system-aware)
- Fully responsive across all devices
- SEO optimized
- Progressive Web App (PWA) ready

## Development

### Prerequisites

- Flutter SDK 3.38.6 or higher
- Chrome browser for web development

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/scoutiq.git
cd scoutiq

# Get dependencies
flutter pub get
```

### Run in Development

```bash
# Run on Chrome
flutter run -d chrome

# Or use hot reload for faster development
flutter run -d chrome --hot
```

### Build for Production

```bash
# Build optimized web app
flutter build web --release

# Output will be in build/web/
```

## Project Structure

```
scoutiq/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── screens/
│   │   └── home_screen.dart      # Main homepage
│   ├── widgets/
│   │   ├── hero_section.dart     # Hero/landing section
│   │   ├── about_section.dart    # About company section
│   │   ├── products_section.dart # Products showcase
│   │   ├── product_card.dart     # Individual product card
│   │   └── footer_section.dart   # Footer with links
│   ├── theme/
│   │   └── app_theme.dart        # Custom Material 3 theme
│   └── models/
│       └── product.dart          # Product data model
├── assets/
│   └── images/                   # Logo files
├── web/
│   ├── index.html               # HTML entry point
│   └── manifest.json            # PWA manifest
└── pubspec.yaml                 # Dependencies
```

## Deployment

### Firebase Hosting

```bash
# Build the app
flutter build web --release

# Deploy to Firebase
firebase deploy --only hosting
```

### Other Platforms

The `build/web` directory contains static files that can be deployed to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## Design Principles

- **Minimalism**: Clean layouts with strategic whitespace
- **Typography**: Clear hierarchy with modern sans-serif fonts
- **Responsive**: Mobile-first approach with adaptive layouts
- **Accessibility**: Proper contrast ratios and semantic structure
- **Performance**: Optimized assets and lazy loading

## Color Palette

- Primary: `#2563EB` (Modern Blue)
- Secondary: `#10B981` (Accent Green)
- Accent Orange: `#F59E0B`
- Accent Purple: `#8B5CF6`
- Dark Background: `#0F172A`
- Light Background: `#FAFAFA`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

© 2026 ScoutIQ LLC. All rights reserved.

## Contact

For inquiries: scoutiq12@gmail.com

---

Built with ❤️ using Flutter
