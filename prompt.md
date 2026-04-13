## Additional requirement: make cell-level explanations truly cell-specific, consistent, and more readable

The detailed monthly breakdown flow is already much better, but the cell-level explanation behavior still needs an important refinement.

### 1. Make every cell explanation consistent with the actual cell context

Right now, when hovering a numeric cell, the explanation is still too biased toward annual logic in some cases.

I want the explanation to be tied to the **exact cell being inspected**.

#### Required rule
- If the hovered/tapped cell is a **monthly cell** (Jan, Feb, etc.), the explanation must be:
  - expressed in **EUR**
  - focused on the **monthly calculation for that exact month**
- If the hovered/tapped cell is in the **annual column**, then the explanation can be:
  - expressed in annual logic
  - tied to the annual total for that row

### Important consistency rule
If the table cell is displayed in **EUR**, then the explanation for that cell must also be shown in **EUR**.
Do not mix EUR and RON inside the cell explanation tooltip/popover unless there is a very strong reason to do so.

Right now, this is not stable enough.
The explanation layer must feel consistent and predictable.

---

## 2. Cell explanations must describe the exact displayed value, not a generic annual formula

The user should feel that each tooltip/popover explains:
- this exact row
- this exact month (or annual total)
- this exact displayed number

Not a generic tax rule detached from the current cell.

### Example
If I inspect a monthly pension contribution cell, the explanation should show:
- what monthly base was used
- what rate was applied
- any cap/threshold logic relevant to that monthly display
- the final monthly result shown in the table

It should not primarily explain the annual formula unless I am actually hovering the annual column.

---

## 3. When constants are involved, explain them inside the cell detail

In many cell explanations, some constants are used implicitly.
For example:
- minimum wage / MW
- tax rates
- caps
- thresholds
- reference values

When a constant materially affects the result, I want the explanation tooltip/popover to include a small “constant context” section such as:
- what this constant is
- the actual value used in the current simulation
- why it matters for this calculation

Example spirit:
- `Minimum wage used in this rule: €X / month`
- `CASS rate used: 10%`
- `Cap applied: ...`

This should remain concise, but it must help the user understand what hidden assumptions are participating in the number.

---

## 4. Multi-step cell explanations should be shown vertically like a mini ledger

For larger or more complex calculations, I want the explanation to be displayed vertically, step by step, so the user can visually follow the arithmetic.

For example, if a monthly amount is derived from several components:
- start with the base
- then show additions/subtractions line by line
- then show the result

This should feel like a compact mini-ledger or mini calculation bridge.

### Example direction
Something like:

- Base monthly amount: €X
- minus contribution A: -€Y
- minus contribution B: -€Z
- equals final monthly amount: €N

### Visual semantics
Use color semantics inside the explanation:
- positive / retained / resulting amounts can be shown in **green**
- deductions / taxes / subtractions can be shown in **red**
- neutral bases/intermediate lines can stay neutral

This is especially useful for rows such as:
- owner net salary received
- company cash after operations
- salary-related taxes
- dividend-related amounts
- net personal cash

The user should understand the arithmetic just by reading vertically.

---

## 5. Preserve simplicity while increasing transparency

The goal is not to create giant heavy tooltips.
The goal is to create:
- short
- precise
- cell-specific
- vertically readable
- trustworthy explanations

This should make the detailed monthly breakdown feel extremely transparent without becoming visually overwhelming.

---

## 6. Use the existing favicon asset where relevant

In the `public` folder, there is a file named:

- `favicon.png`

Use this icon where it makes sense in the app and site experience, for example:
- browser/site icon setup if needed
- relevant branding spots in the UI if appropriate
- any lightweight identity touchpoints already present

Do not overuse it.
Keep usage tasteful and minimal.

---

## 7. Add an Acronyms page and link acronyms throughout the app

This app uses many acronyms and shorthand terms that can be confusing:
- SRL
- PFA
- II
- IF
- CAS
- CASS
- PIT
- MW
- etc.

I want a dedicated page for this, for example:
- `Acronyms`
or
- `Glossary`

### Requirements for this page
Create a clean and simple page that:
- explains each acronym in plain language
- groups acronyms by category
- keeps explanations concise and non-intimidating

### Suggested categories
Examples:
- Legal structures
- Taxes and contributions
- Payroll / salary-related
- Constants / thresholds / reference values
- Other finance or simulator terms

### Linking behavior
Whenever an acronym is used in the app UI, make it clickable (or otherwise clearly linkable) to the Acronyms page or to the relevant glossary anchor.

This should be implemented consistently across the app, not manually in just one or two places.

Use a reusable pattern/component/helper if needed so acronym linking stays maintainable.

### UX goal
The app should feel much safer for users who are new to Romanian contracting/tax language.
If they see an acronym, they should be able to get help immediately.

---

## 8. Implementation note

Before coding, first explain:
1. how you will make cell explanations truly monthly vs annual depending on the hovered cell
2. how you will keep all cell explanations consistently in EUR when the table cell is in EUR
3. how you will structure the vertical mini-ledger explanations
4. how you will expose constant context inside cell explanations
5. how you will add and wire the Acronyms page across the app
6. which files/components you will update

Then implement the changes.
Do not jump straight into code.