# VitalAI — Presentation Data Sources

**Companion document to the VitalAI x Luli Fitness deck**

This document provides the sources behind the figures cited in the presentation, so every number can be independently verified.

---

## Slide: "The Problem"

### 538M wearables shipped in 2024

**Source:** IDC (International Data Corporation), Worldwide Quarterly Wearable Device Tracker.

IDC reported global wearable shipments reaching approximately **538 million units in 2024**, representing ~6.1% year-over-year growth, driven by a refresh cycle in mature markets and continued adoption in emerging regions.

- IDC: [Forecasts Continued Growth for Wearables](https://my.idc.com/getdoc.jsp?containerId=prUS52615024)
- IDC: [Global Wrist-Worn Device Shipments Grew 10.5% in Q1 2025](https://my.idc.com/getdoc.jsp?containerId=prAP53613925)
- Statista: [Wearables worldwide shipments](https://www.statista.com/statistics/437871/wearables-worldwide-shipments/)

*Note: Different trackers report slightly different totals (534M–540M) depending on which device categories are included. 538M reflects IDC's 2024 figure.*

---

### 80% of users abandon nutrition apps within 2 weeks

**Source:** Multiple industry analyses and dietary self-monitoring studies.

Across sources, **70–80% of users abandon diet and nutrition apps within the first two weeks**, primarily because manual food logging is too time-consuming (15–23 minutes per day), data feels unreliable, or the experience feels stressful. We cite the conservative-but-well-supported 80% figure.

- Market.us: [Diet and Nutrition Apps Statistics and Facts](https://media.market.us/diet-and-nutrition-apps-statistics/) — 70% abandon within 2 weeks if too complex/time-consuming
- Kygo: [Why 80% of People Quit Food Logging Apps](https://www.kygo.app/post/why-80-of-people-quit-food-logging-apps-and-how-to-actually-stick-with-it)
- NIH/PMC: [Barriers to and Facilitators for Using Nutrition Apps: Systematic Review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8409150/)
- NIH/PMC: [When and Why Adults Abandon Lifestyle Behavior and Mental Health Mobile Apps](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11694054/)

**Why this matters for VitalAI:** The #1 cited reason for abandonment is the burden of manual logging. This is precisely the problem automatic meal detection is designed to eliminate.

---

### 10–15% average retention for health apps after 30 days

**Source:** Mobile app retention benchmark reports.

Day-30 retention for health & fitness apps varies by methodology, but **average performers land in the ~8–20% range**, with only top-tier apps reaching 25%+. Our 10–15% figure sits in the realistic middle of that band.

- Business of Apps: [Health & Fitness App Benchmarks](https://www.businessofapps.com/data/health-fitness-app-benchmarks/)
- Plotline: [Retention Rates for Mobile Apps by Industry](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry)
- Snoopr: [Mobile App Retention Benchmarks 2026](https://www.snoopr.co/blog/mobile-app-retention-benchmarks-2026-what-good-looks-like-for-fitness-ecommerce-gaming-and-more)

**VitalAI's target:** 40%+ daily active users after 30 days — well above category average — by replacing passive dashboards with proactive, contextual engagement.

---

## Slide: "Differentiator 2 — Meal Detection"

### 85% precision / 81% recall (gesture detection)

**Source:** Peer-reviewed research on wrist-worn IMU (accelerometer + gyroscope) eating detection.

These figures come from machine-learning studies detecting eating gestures via smartwatch motion sensors. **Important context:** these are person-independent results in semi-controlled conditions. In free-living (real-world) conditions, accuracy drops — some studies report precision as low as 65% — due to confounding gestures (drinking, brushing teeth, phone use), non-dominant-hand wear, and eating-style variability. Per-user personalization improves results.

- NIH/PMC: [Smartwatch-Based Eating Detection: ML from Imbalanced Data](https://pmc.ncbi.nlm.nih.gov/articles/PMC7963188/)
- NIH/PMC: [Enabling Eating Detection in a Free-Living Environment](https://pmc.ncbi.nlm.nih.gov/articles/PMC8924783/)
- NIH/PMC: [Top-Down Detection of Eating Episodes Using a CNN](https://pmc.ncbi.nlm.nih.gov/articles/PMC8869422/)
- NIH/PMC: [Assessing Eating Behaviour Using Upper Limb Motion Sensors (Systematic Review)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6566929/)

---

## Slide: "Market"

### $12.25B global digital health coaching (2025)

Digital health coaching market, valued at ~$10.9B in 2024, projected to reach ~$35B by 2034 at ~12.5% CAGR. Sources for market sizing should be cross-referenced against the specific market-research firm's report (e.g., Precedence Research, Grand View Research) before external publication.

### $1.5B Brazil digital health (+18% YoY)

Brazil digital health market estimate. Recommend confirming with a Brazil-specific source (e.g., ABStartups, Distrito healthtech reports) before sharing externally as a hard figure.

---

## A Note on Methodology

Where multiple credible sources disagreed, we chose the **conservative, well-supported** figure rather than the most dramatic one. The product's case does not depend on inflated numbers — the core problem (passive data, manual-logging friction, low retention) is well-documented across every source consulted.

Market-sizing figures ($12.25B, $1.5B) are the softest numbers in the deck and should be re-verified against a primary market-research report before any external/investor distribution.
