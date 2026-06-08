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

### 86% of users abandon diet & nutrition apps

**Primary source:** Roberts et al., *"When and Why Adults Abandon Lifestyle Behavior and Mental Health Mobile Apps: Scoping Review,"* **Journal of Medical Internet Research (JMIR), 2024.** A peer-reviewed scoping review of mobile health app abandonment.

Exact findings from the review:

- **Diet apps: 86% abandonment rate** — the figure cited on the slide
- Fitness apps: **69% abandoned within 90 days**; health apps: **66% within 90 days**
- **Median 70% of users discontinue within the first 100 days**
- For comparison, the average across *all* app categories is 52% — health/diet apps are abandoned faster than the norm
- Abandonment follows a curvilinear pattern: sharp drop-off soon after install, then a slowing rate

**Citation:** JMIR 2024;26:e56897 — [https://www.jmir.org/2024/1/e56897](https://www.jmir.org/2024/1/e56897)

Supporting peer-reviewed reviews:
- NIH/PMC: [Barriers to and Facilitators for Using Nutrition Apps: Systematic Review](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8409150/)

**Why this matters for VitalAI:** The #1 cited reason for abandonment is the burden of manual food logging. This is precisely the problem automatic meal detection is designed to eliminate.

*Note: An earlier draft of the deck cited "80% within 2 weeks." That specific framing traces only to marketing blogs, not primary research. We replaced it with the peer-reviewed 86% diet-app figure, which is both more defensible and more striking.*

---

### ~3% health & fitness app retention at day 30

**Primary source:** **AppsFlyer App Retention Benchmarks (2024 edition)** — the mobile attribution industry's standard benchmark dataset, measured across billions of app installs.

Exact findings:

- **Health & fitness day-30 retention: 2.78%** (≈3%) — the figure cited on the slide
- For context, the day-30 benchmark across *all* verticals is ~5% — health & fitness underperforms the cross-industry average
- **Statista** corroborates: ~3.5–4% day-30 retention for the category
- Only dedicated, heavily gamified fitness apps reach **8–12%**; top performers ~25%

**Citations:**
- AppsFlyer: [App Retention Benchmarks](https://www.appsflyer.com/infograms/app-retention-benchmarks/)
- Statista: [Mobile app user retention rate by category](https://www.statista.com/statistics/259329/ios-and-android-app-user-retention-rate/)
- Business of Apps: [Health & Fitness App Benchmarks](https://www.businessofapps.com/data/health-fitness-app-benchmarks/)

**VitalAI's target:** 40%+ daily active users after 30 days — roughly 10x the category benchmark — by replacing passive dashboards with proactive, contextual engagement.

*Note: An earlier draft cited "10–15% retention." Primary benchmark data (AppsFlyer/Statista) actually puts the category at ~3%, so the real number is lower — and makes the retention problem the deck describes even more acute.*

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
