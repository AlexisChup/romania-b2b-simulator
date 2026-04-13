# Implementation-Oriented Research for a Romania IT Contractor Income Simulator

## Executive summary

For an IT contractor/software builder operating in entity["country","Romania","eu member state"], the simulator’s “core engine” should revolve around four branching choices: **PFA**, **II**, **IF**, and **SRL**, then a second pivot on **tax regime** (especially **SRL micro vs profit tax**) and a third pivot on **payout strategy** (salary vs dividends vs retain). citeturn37view0turn13view0turn13view1

Two structural facts are the biggest implementation drivers in 2026:

- **SRL micro got simpler on the rate, tighter on the ceiling.** From 2026 there is a **single micro tax rate of 1%** (the prior 3% rate was eliminated, along with the 60,000 EUR trigger and the list of CAEN codes—including software/IT codes—that previously pushed firms into 3%). citeturn13view0turn14search3  
  But the **micro turnover ceiling is 100,000 EUR**; if exceeded during 2026, the company moves to **profit tax starting the quarter of exceedance**, and it cannot opt back for the next period. citeturn13view0turn13view1

- **Dividend payouts are materially less attractive than before.** Dividends distributed starting **1 Jan 2026** are taxed at **16%** (up from 10%). citeturn14search1turn14search4turn14search15  
  On top of dividend withholding tax, the **individual may owe CASS (health contribution) on dividends** if their relevant annual income crosses threshold bands expressed in multiples of the minimum wage. citeturn5view0

For PFA/II (and IF, with allocation to members), the tax engine is dominated by (a) **net income after deductible expenses**, then (b) **CAS** (pension) and **CASS** (health) thresholds/caps, including the 2026 change that increased the **CASS cap for independent activity to 72 minimum wages**. citeturn16view0turn15view5

For this specific profile (solo full‑stack, likely high-margin services, typical daily rates such that annual revenue often sits **near** micro/VAT thresholds), the simulator should treat the “best structure” as **scenario-dependent** rather than a single answer:

- **If annual revenue is comfortably under the SRL micro ceiling** and expenses are not very high: SRL micro often becomes competitive because the company-level tax is a flat **1% of (micro tax base) revenue**, then you choose salary/dividend mix. citeturn13view0turn13view1turn14search1  
- **If annual revenue crosses the micro ceiling** (services + apps/SaaS combined): the simulator must switch to **profit-tax modeling** (16% on taxable profit) and re-evaluate whether retaining earnings or paying salary becomes more efficient. citeturn13view0turn30view1  
- **If your business has meaningful deductible costs** (equipment, subcontractors, travel, etc.): profit-tax or PFA real-system modeling can outperform micro, because micro is revenue-based and ignores cost structure. citeturn30view0turn13view0

## Comparison table

| Dimension | PFA | II | IF | SRL |
|---|---|---|---|---|
| Legal nature | Individual form for economic activity; rules in OUG 44/2008 as amended | Individual enterprise form in OUG 44/2008 | Family enterprise under OUG 44/2008 | Company form under companies law; separate taxpayer for corporate taxes |
| Solo eligibility | Yes | Yes | **No** (requires family members) | Yes (can be single-shareholder SRL) citeturn38search0turn37view0 |
| Employees | Up to **3** employees; max **5 CAEN classes** citeturn37view0 | Up to **8** employees; max **10 CAEN classes** citeturn37view0 | Cannot hire employees citeturn37view0 | Can hire (including owner), needed for some tax regimes (micro condition logic references employee requirement) citeturn13view1 |
| Multiple clients | Allowed; contract exclusivity doesn’t automatically change legal status in OUG 44/2008 summary citeturn37view0 | Allowed citeturn37view0 | Allowed via representative citeturn37view0 | Allowed |
| Liability profile | Personal liability (practical risk is personal exposure) | Personal liability | Personal liability shared among members | Limited liability in principle (subject to corporate law/abuse doctrines) |
| Accounting burden | “Partidă simplă” (single-entry) and registers for real system (cash-in/out, inventory etc) citeturn33view0turn16view0 | Similar bookkeeping approach to PFA under OUG framework citeturn33view0turn37view0 | Similar principles, but allocation across members citeturn37view0 | Double-entry accounting and practical accountant reliance (implementation should assume accountant cost input) |
| Best fit for software product income | Works, but still personal tax logic; VAT rules can become complex for digital sales | Same | Less typical | Often operationally easiest for mixing services + product revenue streams (platform payouts, subscriptions), plus payout flexibility |
| Key breaking points for simulation | CAS/CASS thresholds and caps; expense model accuracy citeturn16view0turn15view5 | Same as PFA, but higher scaling room (more employees/CAEN) citeturn37view0 | Not relevant for solo profile; adds allocation complexity citeturn37view0 | Micro ceiling **100k EUR**, dividend tax **16%**, employee condition timing for micro, VAT threshold **395k RON**, capital rules **500/5,000 RON** citeturn13view0turn13view1turn14search1turn15view2turn39search0 |

## Implementation-ready constants table

Values below are chosen to be **directly reusable** in a simulator. Where “value” depends on the year’s minimum wage or an exchange rate, the constant is expressed as a **multiplier** and the simulator must supply the base figure as an input.

**Legend for `confidence`:** high = explicit in cited text; medium = derived directly from cited rule with minimal inference; low = requires external confirmation (kept to a minimum).

| constant_id | label | description | value | unit | applies_to | income_type | condition | validity_start | validity_end | source_url | source_type | confidence | notes |
|---|---|---:|---:|---|---|---|---|---|---|---|---|---|---|
| ro_micro_tax_rate_2026 | SRL micro tax rate | Single micro tax rate applied to micro tax base | 0.01 | fraction | SRL | all | micro regime in 2026 | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf` | official | high | “cota unică 1%” and removal of 3%citeturn13view0 |
| ro_micro_3pct_removed_flag_2026 | Micro 3% removed | Micro 3% rate removed; related 60k EUR trigger removed | true | boolean | SRL | all | micro regime in 2026 | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf` | official | high | Eliminates prior 60k and CAEN list incl. software codesciteturn13view0 |
| ro_micro_turnover_cap_eur_2026 | Micro turnover cap | Annual turnover ceiling for micro regime | 100000 | EUR | SRL | all | must be ≤ cap; verified vs linked enterprises per rule | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf` | official | high | Exceedance triggers profit tax from that quarterciteturn13view0turn13view1 |
| ro_micro_turnover_fx_reference | Micro EUR conversion reference | FX used to convert EUR cap uses exchange rate valid at close of prior financial year | “fx_close_prev_year” | enum | SRL | all | cap check in RON equivalent uses closing rate | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf` | official | high | Simulator should ask for the rate used for the year’s cap testciteturn13view0 |
| ro_micro_exit_to_profit_on_cap | Micro exit trigger | If exceed 100k EUR during year → profit tax from that quarter; cannot opt back next period | true | boolean | SRL | all | turnover > 100k EUR | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf` | official | high | Must be surfaced as “regime loss warning”citeturn13view0 |
| ro_micro_employee_condition_days_newco | Micro: employee deadline for newly incorporated | Newly incorporated entity can opt for micro if employee condition met within a defined term | 90 | days | SRL | all | if employee condition unmet in 90 days → profit tax applies | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/10/Brasov/Brasov/legea_227_III.pdf` | official | high | Micro owes profit tax starting following quarter if deadline missedciteturn13view1 |
| ro_dividend_tax_rate_2026 | Dividend withholding tax | Tax rate on dividends distributed starting 1 Jan 2026 | 0.16 | fraction | SRL | dividends | dividends distributed from 2026-01-01 | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/10/Anaf/legislatie/L_141_2025.pdf` | official | high | Confirmed by ANAF guidance notesciteturn14search1turn14search4 |
| ro_dividend_tax_cutoff_rule | Dividend tax cutoff | 16% applies to dividends distributed after 1 Jan 2026 (even if profit from earlier year) | "distribution_date_rule" | enum | SRL | dividends | distribution date drives rate | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/10/Galati/Vrancea/Modif-imp-dividende-Legea-141-25.pdf` | official | high | Use distribution date input in simulatorciteturn14search4 |
| ro_dividend_tax_payment_deadline | Dividend tax remittance deadline | Dividend WHT is declared/paid by company by 25th of next month after payment | 25 | day-of-month | SRL | dividends | when dividends paid | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/10/Brasov/Brasov/profit_2025.pdf` | official | medium | Deadline statement shown in ANAF consolidated noteciteturn14search15 |
| ro_cit_rate | Corporate profit tax rate | Profit tax rate | 0.16 | fraction | SRL | all | profit tax regime | (stable) | (until changed) | `https://legislatie.just.ro/Public/FormaPrintabila/00000G2R9YBQCR3LM010UINNC84C820G` | official | medium | Article shown as 16% in the fiscal code print formciteturn30view1 |
| ro_pit_rate | Personal income tax rate | Flat PIT rate used for independent activity income tax | 0.10 | fraction | PFA/II/IF | services/products | taxed under PIT rules | (stable) | (until changed) | `https://sintact.ro/legislatie/monitorul-oficial/codul-fiscal-din-2015-legea-227-2015-16950032/art-64` | secondary (legal db) | medium | Use for PFA/II PIT in simulator; validate annuallyciteturn26search14 |
| ro_cas_rate_individual | CAS rate | Pension contribution rate used for individual CAS computation | 0.25 | fraction | PFA/II/IF | services/products | when CAS due | (stable) | (until changed) | `https://static.anaf.ro/static/10/Ploiesti/venituri_pf_activ_independente.pdf` | official | high | “CAS … 25%” in ANAF materialciteturn15view5 |
| ro_cass_rate | CASS rate | Health contribution rate | 0.10 | fraction | PFA/II/IF/SRL-shareholder | all | when CASS due | (stable) | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Examples compute at 10%citeturn16view0 |
| ro_cas_threshold_minwage_mult | CAS threshold | CAS becomes mandatory when independent + copyright income ≥ 12 minimum wages | 12 | min_wage_multiplier | PFA/II/IF | services/products | total income for CAS test | (stable) | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Mandatory or optional logic must be modeledciteturn16view0 |
| ro_cas_base_lowband_minwage_mult | CAS base low band | If income between 12 and 24 min wages → minimum CAS base is 12 min wages | 12 | min_wage_multiplier | PFA/II/IF | services/products | 12–24 band | (stable) | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Base may be chosen higher; default to minimum in simulatorciteturn16view0 |
| ro_cas_base_highband_minwage_mult | CAS base high band | If income ≥ 24 min wages → minimum CAS base is 24 min wages | 24 | min_wage_multiplier | PFA/II/IF | services/products | ≥24 band | (stable) | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Default to min base unless user chooses higherciteturn16view0 |
| ro_cass_min_base_minwage_mult | CASS minimum base for independent activity | If net income base < 6 min wages → CASS difference up to 6 min wages may apply (with exceptions) | 6 | min_wage_multiplier | PFA/II | services/products | only if no exception applies | (stable) | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Simulator must implement exemption flags (salary/other CASS-paid incomes)citeturn16view0 |
| ro_cass_cap_base_minwage_mult_2026 | CASS cap for independent activity | CASS base cap for independent activity increased to 72 min wages starting 2026 income | 72 | min_wage_multiplier | PFA/II | services/products | applies for income obtained in 2026+ | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_27-01-2026.pdf` | official | high | Explicitly stated “începând cu veniturile obținute în anul 2026”citeturn16view0 |
| ro_cass_dividends_brackets | CASS brackets for investment/dividends | For certain income categories (incl. dividends), CASS due based on income bands: 6 / 12 / 24 min wages | [6,12,24] | min_wage_multiplier_array | SRL-shareholder | dividends/interest/rent/etc | depends on total relevant income | (stable) | (until changed) | `https://static.anaf.ro/static/10/Brasov/Brasov/CASS_optiune_2025.pdf` | official | high | Simulator should compute mandated band and CASS = 10% * band_baseciteturn5view0turn16view0 |
| ro_vat_standard_rate_2025_08 | VAT standard rate | Standard VAT rate effective 1 Aug 2025 | 0.21 | fraction | all | VAT | if VAT registered / VAT-applicable | 2025-08-01 | (until changed) | `https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf` | official | high | “Cota standard 21%”citeturn2search24 |
| ro_vat_reduced_rate_2025_08 | VAT reduced rate | Reduced VAT rate effective 1 Aug 2025 | 0.11 | fraction | all | VAT | only for eligible supplies | 2025-08-01 | (until changed) | `https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf` | official | high | “Cota redusă 11%”citeturn2search24 |
| ro_vat_exemption_threshold_ron | VAT exemption turnover threshold | VAT exemption threshold (annual) | 395000 | RON | all | VAT | general VAT exemption regime | 2025-09-01 | (until changed) | `https://static.anaf.ro/static/10/Ploiesti/modificari_tva.pdf` | official | high | “plafon … 395.000 lei”citeturn15view2 |
| ro_vat_registration_deadline_day | VAT registration deadline | After exceeding exemption threshold, registration request deadline is the 10th of following month (rule illustrated for Aug 2025 exceedance) | 10 | day-of-month | all | VAT | if threshold exceeded | 2025-09-01 | (until changed) | `https://static.anaf.ro/static/10/Ploiesti/modificari_tva.pdf` | official | medium | Modeled as default rule; expose as “assumption” in UIciteturn15view2 |
| ro_efactura_b2b_valid_invoice_cutoff | e-Factura B2B validity cutoff | For B2B between taxable persons established in Romania, only invoices meeting e-Factura rules are treated as invoices from 1 Jul 2024 | 2024-07-01 | date | all | invoicing | B2B Romania-established taxable persons | 2024-07-01 | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_13-08-2024.pdf` | official | high | Must be a compliance warning moduleciteturn21search6 |
| ro_efactura_submit_deadline_days | e-Factura submission deadline | Deadline to transmit invoice to e-Factura system | 5 | days | all | invoicing | invoice issuance covered by system | 2024-07-01 | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_13-08-2024.pdf` | official | high | Required for warning timers, not net pay calcciteturn21search6 |
| ro_efactura_penalty_rate_b2b | e-Factura penalty | Non-transmission / receiving & recording outside system in B2B can trigger penalty equal to 15% of invoice total | 0.15 | fraction | all | invoicing | B2B Romania-established | 2024-07-01 | (until changed) | `https://static.anaf.ro/static/10/Iasi/material_informativ_13-08-2024.pdf` | official | high | Model as warning: “potential penalty exposure”citeturn21search6 |
| ro_efactura_b2c_reporting_start | e-Factura B2C reporting start | Obligation for B2C reporting starting 1 Jan 2025 (technical note) | 2025-01-01 | date | all | invoicing | invoices to individuals (B2C) | 2025-01-01 | (until changed) | `https://mfinante.gov.ro/web/efactura/informatii-tehnice` | official | medium | Use as warning; confirm applicability nuances in final buildciteturn21search2 |
| ro_efactura_nonestablished_vat_registered_start | e-Factura cross-border Romania VAT-registered | From 1 Jan 2026, obligation covers invoices issued to taxable persons not established but VAT-registered in Romania | 2026-01-01 | date | all | invoicing | Romanian supplier → non-established but RO VAT-registered recipient | 2026-01-01 | (until changed) | `https://static.anaf.ro/static/3/Ploiesti/20260115111226_comunicat%20ajfp%20arges%20-%20modificari%20ro%20e-factura%20site.pdf` | official | high | Important for cross-border B2B edge casesciteturn21search0 |
| ro_pfa_max_caen_classes | PFA CAEN limit | PFA can have at most 5 CAEN activity classes | 5 | count | PFA | all | OUG 44/2008 as amended by Law 182/2016 | 2017-01-17 | (until changed) | `https://static.anaf.ro/static/30/Ploiesti/20161111100008_13.pdf` | official | high | Influences eligibility warnings onlyciteturn37view0 |
| ro_pfa_max_employees | PFA employees max | PFA can perform activity alone or with at most 3 employees | 3 | count | PFA | services/products | as above | 2017-01-17 | (until changed) | `https://static.anaf.ro/static/30/Ploiesti/20161111100008_13.pdf` | official | high | Structural scaling warningciteturn37view0 |
| ro_ii_max_caen_classes | II CAEN limit | II can have at most 10 CAEN activity classes | 10 | count | II | all | as above | 2017-01-17 | (until changed) | `https://static.anaf.ro/static/30/Ploiesti/20161111100008_13.pdf` | official | high | Structural scaling warningciteturn37view0 |
| ro_ii_max_employees | II employees max | II can employ at most 8 employees | 8 | count | II | all | as above | 2017-01-17 | (until changed) | `https://static.anaf.ro/static/30/Ploiesti/20161111100008_13.pdf` | official | high | Structural scaling warningciteturn37view0 |
| ro_if_employees_allowed | IF employee rule | IF cannot hire employees | false | boolean | IF | all | fixed rule | 2017-01-17 | (until changed) | `https://static.anaf.ro/static/30/Ploiesti/20161111100008_13.pdf` | official | high | IF not suited to solo profileciteturn37view0 |
| ro_srl_min_share_capital_new_lei | SRL minimum share capital | For newly incorporated SRL, minimum share capital is 500 lei | 500 | RON | SRL | all | applies from law entry into force | 2025-12-18 | (until changed) | `https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf` | official | high | Confirmed by trade register guidanceciteturn39search0turn39search1 |
| ro_srl_capital_turnover_threshold_lei | SRL turnover threshold for higher capital | If net turnover > 400,000 lei (per annual financials), min share capital becomes higher | 400000 | RON | SRL | all | turnover test based on prior year financial statements | 2025-12-18 | (until changed) | `https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf` | official | high | Threshold-driven compliance rule; warn in simulatorciteturn39search0turn39search1 |
| ro_srl_min_share_capital_high_lei | SRL minimum share capital high tier | Minimum share capital becomes 5,000 lei when turnover over threshold | 5000 | RON | SRL | all | turnover > 400k lei | 2025-12-18 | (until changed) | `https://static.anaf.ro/static/10/Anaf/legislatie/L_239_2025.pdf` | official | high | Includes transition time rules (2 years) and other detailsciteturn39search0turn39search1 |

**Important implementation note:** the “minimum wage” is used as a base to compute several thresholds (CAS, CASS, dividend CASS bands). The simulator must store `minimum_wage_gross_monthly_ron` by tax year and expose it transparently as a constant that can be updated without code changes. The ANAF material illustrates computations using a minimum wage figure in examples; your production version should pull the official figure per year. citeturn16view0turn5view0

## Formula sheet

Below is a formula blueprint designed to be implemented directly. Pseudocode is intentionally simple and parameter-driven.

### Common building blocks

- `annual_service_revenue = tjm * billable_days_per_month * 12`
- `annual_total_revenue = annual_service_revenue + annual_app_income + annual_saas_income + annual_ads_income`
- `annual_deductible_expenses = fixed_expenses + (annual_total_revenue * expense_pct)`
- `min_wage = minimum_wage_gross_monthly_ron`  
- `mw12 = 12 * min_wage`, `mw24 = 24 * min_wage`, `mw6 = 6 * min_wage`, `mw72 = 72 * min_wage`

### PFA and II (real system)

**1) Net business income before taxes**
- `net_income = annual_total_revenue - annual_deductible_expenses` citeturn30view0turn16view0

**2) CAS (pension)**
- If `net_income < mw12`: `cas_due = 0` (unless user opts in)  
- If `mw12 <= net_income < mw24`: `cas_base = mw12`  
- If `net_income >= mw24`: `cas_base = mw24`  
- `cas_due = cas_base * 0.25` citeturn16view0turn15view5

**3) CASS (health) for independent activity**
- If `net_income <= 0`: `cass_due = 0` (unless user opts in)  
- Else:
  - `cass_base_raw = net_income`  
  - `cass_base_capped = min(cass_base_raw, mw72)` for income obtained in 2026+ citeturn16view0  
  - Apply minimum base logic:
    - If `cass_base_capped < mw6`: you may owe a **difference** up to the 6-min-wage base, **unless** qualifying exceptions apply (e.g., you already had salary income at/above a threshold or already owe CASS for other categories at/above that level). citeturn16view0  
  - In a first implementation, model this as:
    - `cass_base = max(cass_base_capped, mw6)` unless `cass_min_base_exception == true`  
  - `cass_due = cass_base * 0.10` citeturn16view0

**4) PIT (income tax)**
- `pit_base = net_income - cas_due - cass_deductible_part`  
  - ANAF notes indicate that the “difference CASS” (the top‑up to reach minimum base) is handled separately in determining net taxable income; implement as:
  - `cass_deductible_part = min(cass_due, net_income * 0.10)` (so the extra top-up is not deducted) citeturn22search9turn16view0  
- `pit_due = max(0, pit_base) * 0.10` citeturn26search14turn16view0

**5) Net personal cash**
- `net_personal_cash = annual_total_revenue - annual_deductible_expenses - cas_due - cass_due - pit_due`

### IF (family enterprise)

Treat IF as the same tax mechanics as PFA/II **but split** the net income to members by agreement percentages, then compute each member’s CAS/CASS/PIT individually. The structure constraint is that IF cannot hire employees. citeturn37view0

Pseudo:
- `net_income_total = annual_total_revenue - expenses`
- For each member `i`:
  - `member_income = net_income_total * member_share[i]`
  - compute `cas_due[i], cass_due[i], pit_due[i]` with PFA-like logic above
- Output both per-member and aggregated totals.

### SRL micro (2026 rule set, simplified tax base)

**1) Company tax (micro)**
- `micro_tax_due = micro_tax_base * 0.01`  
  For a first version, model `micro_tax_base ≈ annual_total_revenue` for typical IT services. citeturn13view0

**2) Salary route**
- Inputs:
  - `owner_gross_salary_monthly`
  - `months_paid` (usually 12)
- Employee-side:
  - `sal_cas = gross * 0.25`
  - `sal_cass = gross * 0.10`
  - `salary_taxable = gross - sal_cas - sal_cass - allowance_inputs`
  - `sal_pit = max(0, salary_taxable) * 0.10` citeturn15view5turn16view0turn28search11
- Employer-side:
  - `employer_cam = gross * cam_rate` (use `cam_rate = 0.0225`) citeturn26search11turn22search2
  - `company_salary_cost = gross + employer_cam`
- Net salary:
  - `net_salary = gross - sal_cas - sal_cass - sal_pit`

**3) Company cash / profit approximation**
- `company_cash_after_ops = annual_total_revenue - operating_expenses - total_company_salary_cost - micro_tax_due`

**4) Dividend distribution**
- `dividend_gross = max(0, company_cash_after_ops - retained_cash_target)`
- `dividend_withholding = dividend_gross * 0.16` citeturn14search1turn14search4
- `dividend_net_paid = dividend_gross - dividend_withholding`

**5) Shareholder CASS on dividends**
- Compute annual “CASS-relevant income” from dividends (and other non-salary categories user inputs).
- Determine bracket:
  - If `income < 6*min_wage`: `cass_dividends_due = 0`
  - Else if `< 12*min_wage`: base = `6*min_wage`
  - Else if `< 24*min_wage`: base = `12*min_wage`
  - Else base = `24*min_wage`
- `cass_dividends_due = base * 0.10` citeturn5view0

**6) Personal net**
- `net_personal_cash = net_salary_total + dividend_net_paid - cass_dividends_due`

**Micro loss mid-year:** if `annual_total_revenue_eur_equiv > 100000`, produce a warning and (advanced mode) compute a blended year: micro tax up to the quarter of exceedance, then profit tax thereafter. citeturn13view0turn13view1

### SRL profit tax (CIT)

- `profit_before_tax = annual_total_revenue - deductible_company_expenses - salary_costs - depreciation_inputs`
- `cit_due = max(0, profit_before_tax) * 0.16` citeturn30view1
- `profit_after_tax = profit_before_tax - cit_due`
- Dividends then follow the dividend module above (16% withholding + possible CASS on dividends). citeturn14search1turn5view0

## Simulator input specification

The goal is to keep inputs minimal for v1 but expandable.

**Required inputs (v1)**
- Structure: `structure_type ∈ {PFA, II, IF, SRL}`
- Income:
  - `tjm` (daily rate)
  - `billable_days_per_month`
  - `annual_app_income` (or monthly)
  - `annual_other_product_income` (SaaS/subscriptions/licenses/ads)
- Currency & year settings:
  - `tax_year`
  - `currency` for each income stream
  - `fx_assumption_eur_to_ron` (average) and `fx_close_prev_year_eur_to_ron` (for micro threshold tests) citeturn13view0
  - `minimum_wage_gross_monthly_ron` (by tax year; defaults must be documented)
- Costs:
  - `expense_mode ∈ {percent_of_revenue, fixed_amount, detailed}`
  - `expense_pct` or `annual_fixed_expenses`
- For SRL:
  - `srl_regime ∈ {micro, profit_tax}`
  - `salary_strategy ∈ {no_salary, minimum_salary, custom_salary}`
  - `owner_gross_salary_monthly` (if salary used)
  - `retain_profit_pct` or `retained_cash_target`

**Advanced inputs (recommended for v1.1)**
- PFA/II:
  - `cas_base_choice ∈ {minimum, custom}` and `cas_base_custom_amount`
  - `cass_min_base_exception` flags (e.g., already insured by salary over threshold) citeturn16view0
- SRL payroll:
  - `cam_rate_override` (default 2.25%) citeturn26search11turn22search2
  - `personal_deduction_amount` (default 0, unless user wants precision)
  - optional `it_income_tax_exemption_flag` (only if properly researched and implemented)
- VAT layer:
  - `vat_registered ∈ {no, yes, special_art_317_only}`
  - `annual_vat_taxable_turnover_ron`
  - `b2b_ro`, `b2b_eu`, `b2c_digital` shares (for warning logic) citeturn15view2turn16view0
- Reclassification risk flags:
  - user‑assessed checklist for “independent activity criteria (4 of 7)” and additional “single-client/dependency” heuristics citeturn20view0

**Optional assumptions**
- `unpaid_time_pct` (vacations, bench)
- `collection_delay_days`
- `platform_fee_pct` for app stores / marketplaces (not a tax but affects revenue)
- `withholding_tax_on_platform_payouts` (for non-RO platforms; if used, clearly mark as non‑Romanian)

## Simulator outputs specification

Outputs should be broken into: **cash flow summary**, **tax breakdown**, **threshold/warning panel**, and **explainability (source-linked)**.

**Core outputs (always)**
- Monthly and annual:
  - `gross_revenue` (by stream: services vs products)
  - `deductible_expenses_assumed`
  - `total_taxes_contributions`
  - `net_personal_cash` (monthly + annual)
  - `effective_tax_rate = total_taxes_contributions / gross_revenue`
- Structure-specific:
  - PFA/II: `CAS_due`, `CASS_due`, `PIT_due`
  - SRL: `micro_tax_due` or `CIT_due`, payroll taxes, `dividend_withholding`, shareholder `CASS_on_dividends`, `retained_company_cash`

**Warnings / eligibility outputs**
- SRL micro:
  - “Turnover cap risk” if expected EUR-equivalent revenue close to 100,000
  - “Employee condition timeline” notice (e.g., 90-day rule for newco) citeturn13view1
- VAT:
  - “VAT exemption threshold crossed” if turnover > 395,000 RON citeturn15view2
  - “VAT registration deadline assumptions” (10th of following month) citeturn15view2
- e-Factura:
  - B2B Romania: “must transmit invoices within 5 days” and “15% contravention risk” citeturn21search6
  - Cross-border RO VAT-registered recipient rule from 2026 where relevant citeturn21search0
- SRL capital rule:
  - “Minimum share capital: 500 lei for new SRL; 5,000 lei if turnover > 400,000 lei (net)” citeturn39search0turn39search1
- Reclassification risk:
  - If user cannot confirm ≥4/7 independence criteria, show warning and explain consequences at a high level citeturn20view0

**Explainability outputs**
- For every major constant used, show:
  - value, date validity, and a source link (use the `source_url` field in constants table and in JSON constants list). citeturn13view0turn14search1turn15view2turn16view0turn2search24turn39search0

## Test scenarios and JSON data model

### Test scenarios

All scenarios assume **12 months**, and ignore VAT cash-flow effects unless stated (VAT should appear as warnings and optional cash-flow module). VAT exemption threshold and micro cap warnings should be triggered based on currency conversion inputs. citeturn13view0turn15view2

**Scenario A: 216 EUR/day, 18 billable days/month, no app income**  
- Annual services revenue ≈ 46,656 EUR (below 100k).  
- Likely outcome: SRL micro *may* be attractive if you want payout flexibility, but PFA/II can also be competitive depending on expense ratio and how CAS/CASS hit your band/cap. citeturn13view0turn16view0turn14search1  
- Threshold checks: micro cap not crossed; VAT threshold depends on RON equivalent (warning-only).

**Scenario B: 250 EUR/day, 20 days/month, no app income**  
- Annual ≈ 60,000 EUR.  
- Similar: SRL micro generally stays eligible; watch VAT threshold (395k RON) depending on exchange rate and whether turnover is VAT-taxable. citeturn13view0turn15view2

**Scenario C: 300 EUR/day, 20 days/month, no app income**  
- Annual ≈ 72,000 EUR.  
- VAT threshold risk increases; micro still likely eligible but now closer to thresholds where capital-rule warnings might become relevant (400k RON turnover threshold for capital tier depends on FX and “net turnover” definition). citeturn39search0turn15view2turn13view0

**Scenario D: 400 EUR/day, 20 days/month, no app income**  
- Annual ≈ 96,000 EUR, very close to micro cap 100,000 EUR.  
- Likely outcome: simulator should show **high micro-loss risk** and recommend comparing:
  - SRL micro (if you can stay under cap) vs
  - SRL profit tax (if you expect to exceed with any extra projects/apps) vs
  - PFA/II if you want to avoid regime-switch complexity. citeturn13view0turn13view1turn16view0

**Scenario E: 300 EUR/day, 20 days/month + 10k EUR/year app income**  
- Annual ≈ 82,000 EUR.  
- SRL micro still likely, but VAT and platform cross-border invoicing warnings become more relevant (e-Factura and VAT special registrations should appear as warning modules). citeturn21search6turn16view0turn15view2

**Scenario F: 300 EUR/day, 20 days/month + 30k EUR/year app income**  
- Annual ≈ 102,000 EUR → likely exceeds 100k micro ceiling.  
- Likely outcome: SRL profit tax modeling becomes the primary route; show “micro regime loss” warning and compute profit tax + dividend system. citeturn13view0turn30view1turn14search1

**Scenario G: Low-scale solo product scenario (0 services, 15k EUR/year apps)**  
- Revenue low; PFA/II can be very simple, but SRL can still be used if you want limited liability and retained earnings.  
- Simulator should emphasize the VAT/e-Factura compliance module because digital/platform revenue can trigger special obligations even at low headline revenue (implemented as warnings unless user enables VAT module). citeturn21search2turn21search6turn16view0

**Scenario H: Scenario that crosses VAT threshold**  
- Use a synthetic `annual_turnover_ron > 395,000`.  
- Simulator outputs: VAT threshold crossed warning, expected registration timing (10th of next month assumption), and a toggle to include VAT as cash-flow if user wants (collection vs deduction). citeturn15view2

### JSON-ready data model proposal

```json
{
  "meta": {
    "country": "RO",
    "tax_year": 2026,
    "currency_base": "RON",
    "last_verified_at": "2026-04-13",
    "assumptions": {
      "vat_is_warning_only_by_default": true,
      "micro_tax_base_equals_revenue_for_it_services": true,
      "salary_personal_deductions_default_zero": true
    }
  },
  "constants": [
    {
      "constant_id": "ro_micro_tax_rate_2026",
      "label": "SRL micro tax rate",
      "value": 0.01,
      "unit": "fraction",
      "applies_to": ["SRL"],
      "income_type": ["services", "products", "mixed"],
      "condition": "srl_regime == 'micro' && tax_year >= 2026",
      "validity_start": "2026-01-01",
      "validity_end": null,
      "source_url": "https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf",
      "source_type": "official",
      "confidence": "high"
    },
    {
      "constant_id": "ro_micro_turnover_cap_eur_2026",
      "label": "Micro turnover cap",
      "value": 100000,
      "unit": "EUR",
      "applies_to": ["SRL"],
      "income_type": ["services", "products", "mixed"],
      "condition": "srl_regime == 'micro' && tax_year >= 2026",
      "validity_start": "2026-01-01",
      "validity_end": null,
      "source_url": "https://static.anaf.ro/static/3/Ploiesti/20260121160412_comunicat%20ajfp%20arges%20-%20micro%202027%20site.pdf",
      "source_type": "official",
      "confidence": "high"
    },
    {
      "constant_id": "ro_dividend_tax_rate_2026",
      "label": "Dividend withholding tax",
      "value": 0.16,
      "unit": "fraction",
      "applies_to": ["SRL"],
      "income_type": ["dividends"],
      "condition": "dividend_distribution_date >= '2026-01-01'",
      "validity_start": "2026-01-01",
      "validity_end": null,
      "source_url": "https://static.anaf.ro/static/10/Anaf/legislatie/L_141_2025.pdf",
      "source_type": "official",
      "confidence": "high"
    },
    {
      "constant_id": "ro_vat_exemption_threshold_ron",
      "label": "VAT exemption turnover threshold",
      "value": 395000,
      "unit": "RON",
      "applies_to": ["PFA", "II", "IF", "SRL"],
      "income_type": ["vat_taxable_turnover"],
      "condition": "annual_vat_taxable_turnover_ron <= threshold",
      "validity_start": "2025-09-01",
      "validity_end": null,
      "source_url": "https://static.anaf.ro/static/10/Ploiesti/modificari_tva.pdf",
      "source_type": "official",
      "confidence": "high"
    }
  ],
  "structures": [
    {
      "structure_id": "PFA",
      "label": "PFA",
      "supports_multiple_clients": true,
      "max_caen_classes": 5,
      "max_employees": 3,
      "notes": "Single-entry bookkeeping; taxes are individual (PIT/CAS/CASS)."
    },
    {
      "structure_id": "II",
      "label": "II",
      "supports_multiple_clients": true,
      "max_caen_classes": 10,
      "max_employees": 8,
      "notes": "Similar taxation to PFA; more scaling room."
    },
    {
      "structure_id": "IF",
      "label": "IF",
      "supports_multiple_clients": true,
      "max_caen_classes": null,
      "max_employees": 0,
      "notes": "Not suitable as solo; income allocated to members."
    },
    {
      "structure_id": "SRL",
      "label": "SRL",
      "supports_multiple_clients": true,
      "min_share_capital_rules": [
        {"condition": "new_company == true", "min_share_capital_ron": 500},
        {"condition": "prior_year_net_turnover_ron > 400000", "min_share_capital_ron": 5000}
      ],
      "notes": "Company-level tax + payout mechanics (salary/dividends/retain)."
    }
  ],
  "revenue_types": [
    {"revenue_type_id": "b2b_services", "label": "B2B software services"},
    {"revenue_type_id": "b2c_digital", "label": "B2C app/digital sales"},
    {"revenue_type_id": "platform_payouts", "label": "App store / platform payouts"},
    {"revenue_type_id": "saas_subscriptions", "label": "SaaS/subscriptions"},
    {"revenue_type_id": "licensing", "label": "Licenses/royalties-like revenue"},
    {"revenue_type_id": "ads", "label": "Advertising / IAP"}
  ],
  "thresholds": [
    {
      "threshold_id": "micro_turnover_cap_eur_2026",
      "applies_to": ["SRL"],
      "metric": "annual_turnover_eur_equiv",
      "operator": "<=",
      "value": 100000,
      "when_triggered": "warn_and_switch_to_profit_tax_from_exceed_quarter"
    },
    {
      "threshold_id": "vat_exemption_threshold_ron",
      "applies_to": ["PFA", "II", "IF", "SRL"],
      "metric": "annual_vat_taxable_turnover_ron",
      "operator": ">",
      "value": 395000,
      "when_triggered": "warn_vat_registration_required"
    }
  ],
  "formulas": [
    {
      "formula_id": "annual_revenue",
      "inputs": ["tjm", "billable_days_per_month", "annual_app_income", "annual_other_income"],
      "pseudocode": "annual_service = tjm * billable_days_per_month * 12; annual_total = annual_service + annual_app_income + annual_other_income;"
    },
    {
      "formula_id": "pfa_net",
      "inputs": ["annual_total_revenue", "annual_deductible_expenses", "min_wage", "cas_rate", "cass_rate", "pit_rate"],
      "pseudocode": "net_income = annual_total_revenue - annual_deductible_expenses; ... compute CAS/CASS/PIT per bands; net_cash = annual_total_revenue - annual_deductible_expenses - taxes;"
    },
    {
      "formula_id": "srl_micro_net",
      "inputs": ["annual_total_revenue", "operating_expenses", "owner_salary_gross", "micro_tax_rate", "dividend_tax_rate", "cass_brackets"],
      "pseudocode": "micro_tax = annual_total_revenue * micro_tax_rate; company_cash = annual_total_revenue - operating_expenses - salary_costs - micro_tax; dividends = ...; personal_net = salary_net + dividends_net - cass_on_dividends;"
    }
  ],
  "warnings": [
    {
      "warning_id": "micro_cap_risk",
      "severity": "high",
      "trigger": "annual_turnover_eur_equiv > 95000",
      "message": "You are close to the 100,000 EUR micro turnover cap. Micro may be lost if exceeded."
    },
    {
      "warning_id": "efactura_b2b_penalty_risk",
      "severity": "medium",
      "trigger": "has_b2b_ro == true",
      "message": "B2B invoices must be transmitted via RO e-Factura within 5 days; non-compliance can trigger penalties."
    }
  ],
  "scenarios": [
    {
      "scenario_id": "A_216_18_no_apps",
      "inputs": {"tjm": 216, "billable_days_per_month": 18, "annual_app_income": 0},
      "expected_focus": ["compare_pfa_vs_srl_micro", "vat_warning_check"]
    },
    {
      "scenario_id": "F_300_20_plus_30k_apps",
      "inputs": {"tjm": 300, "billable_days_per_month": 20, "annual_app_income": 30000},
      "expected_focus": ["micro_regime_loss", "profit_tax_engine"]
    }
  ]
}
```