## Additional requirement: clarify CAEN in the glossary, simplify duplicate comparisons, and add an eligibility simulator

### 1. Add `CAEN` to the glossary / acronyms page

The app uses the term `CAEN` / `CAEN activity classes`, and this must be explained clearly in the glossary.

Use a simple user-friendly definition such as:
- `CAEN = the official Romanian classification code/category for an authorized business activity`

Make sure this appears in:
- the Acronyms / Glossary page
- any place where `CAEN` is used in the UI
- any eligibility-related explanation where CAEN limits matter

Do not assume the user knows this term.

---

### 2. Reassess whether PFA / II / IF really need separate financial comparison cards

I want you to check whether the current simulation engine actually produces meaningfully different financial outputs for:
- PFA
- II
- IF

### Important decision rule
If PFA and II currently use the same tax engine and produce the same financial outputs under the current solo assumptions, then do NOT keep them as fully separate comparison cards just for the sake of it.

Instead:
- merge them in the financial comparison layer into a shared result such as:
  - `PFA / II`
  - or `PFA + II`
  - or another clear label indicating same tax outcome in the current scenario

### Important nuance
Even if they are merged in the financial comparison view, they should still remain distinct in:
- the Structures Guide
- the Glossary
- the Eligibility Simulator

Because their structural rules differ:
- allowed CAEN classes
- employee limits
- operational scaling constraints

### IF handling
For IF:
- if the current simulator does not model family-member allocation inputs in a meaningful way
- and if the current app is mainly optimized for a solo user
then IF should not be displayed like a normal solo financial comparison option by default.

Instead:
- either hide IF from the default financial comparison
- or show it as a special structure with a note like:
  - `family structure / not standard for solo case`

If later the app adds explicit family allocation inputs, then IF can become a more complete financial simulation path.

### Goal
Do not waste comparison space on structures that currently compute the same numbers.
Simplify the UI where the engine is actually identical.

---

## 3. Add a new page: Eligibility Simulator

I want a separate page in addition to the money simulator.

This page should help the user understand:
- which structures they are eligible for
- which structures are not compatible with their intended setup
- which structures are technically possible but constrained

This is not an income simulator.
It is an **eligibility / fit simulator**.

### Main idea
The page should ask structural / operational questions and then output something like:
- Eligible
- Conditionally eligible
- Not suitable
- Not eligible

for each structure:
- PFA
- II
- IF
- SRL

### Use the existing research documents
Use the attached research documents as the source of truth for the structural rules.

Do not rewrite the whole documents into the UI.
Use them to derive clear rule-based logic.

### Inputs for the Eligibility Simulator
Design a simple but useful set of inputs, such as:

- `Solo or family setup?`
- `Number of family members involved`
- `Desired number of CAEN activity classes`
- `Planned number of employees`
- `Need limited liability?`
- `Want the simplest bookkeeping/admin?`
- `Need to combine services + software products?`
- `Need multiple clients?`
- `Need to stay compatible with solo independent activity?`

You may refine the exact list, but keep it focused and practical.

### Outputs
For each structure, return:
- eligibility status
- short explanation
- main reason(s)
- main constraint(s)
- key next warning(s)

### Example output style
- `PFA: Not suitable if you need 6 CAEN classes`
- `II: Eligible for 6 CAEN classes and 5 employees`
- `IF: Not suitable for a solo setup`
- `SRL: Eligible, but more admin/compliance complexity`

### Reuse existing logic where possible
If the app already has warning logic or structural constants for:
- CAEN limits
- employee limits
- family-only constraints
- SRL-specific structural conditions

reuse them instead of duplicating logic.

### Goal
I want the app to answer two different user questions:
1. `Which option gives me the best net outcome?`
2. `Which option is actually structurally compatible with what I want to do?`

These are different questions and should not be mixed into one overloaded page.

---

## 4. Implementation guidance

Before coding, first explain:
1. whether PFA and II are currently using the same financial engine in the code
2. whether IF is meaningfully modeled as a distinct financial case right now
3. whether the comparison UI should merge PFA and II in the current version
4. what inputs/outputs the Eligibility Simulator page will have
5. which existing rules/warnings/constants can be reused
6. which files/components/routes you will add or modify

Then implement the changes.
Do not jump straight into code.

## Additional simplification for solo mode

This simulator is primarily designed for a **solo user case**.

### 1. Add `CAEN` to the glossary
Make sure `CAEN` is clearly defined in the Acronyms / Glossary page in simple language, for example:
- `CAEN = official Romanian activity classification code/category used to define which business activities a structure is allowed to perform`

Also make sure any UI usage of `CAEN` links to the glossary/help entry.

### 2. Simplify the financial comparison for solo mode
Reassess whether `PFA`, `II`, and `IF` truly need to appear as separate financial comparison options.

If the current financial engine produces the same tax/net result for `PFA` and `II` in the current solo simulation logic, then merge them into a single comparison option such as:
- `PFA / II`

### 3. Do not show IF as a normal default solo comparison option
Because this simulator is for a solo use case, `IF` should not be shown as a standard financial comparison card by default.

Instead:
- either hide it from the default money comparison
- or show it only as a special/non-default structure with a note like:
  - `Family structure, not standard for solo setups`

### 4. Keep structures separate outside the money comparison
Even if `PFA` and `II` are merged in the financial comparison view, keep `PFA`, `II`, `IF`, and `SRL` separate in:
- the Structures Guide
- the Acronyms / Glossary page
- the Eligibility Simulator

Because their structural constraints still differ:
- CAEN limits
- employee limits
- family-only constraints
- scaling/administrative implications

### 5. Implementation check before coding
Before implementing, first confirm:
- whether `PFA` and `II` currently use the same financial engine in the code
- whether `IF` is meaningfully distinct in the current financial simulation
- whether the solo comparison should therefore become:
  - `PFA / II`
  - `SRL`
  - and optionally a non-default `IF` informational case

Then implement the simplification.
Do not keep duplicate comparison cards if they produce the same financial outcome in solo mode.