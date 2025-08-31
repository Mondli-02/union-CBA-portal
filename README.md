# JobScope

**JobScope** is a minimal, responsive job description search tool and salary calculator. It allows users to explore job roles, grades, sectors, and industries, and provides recommended salary ranges, calculators for allowances, and a glossary of terms. The app is designed to be user-friendly, mobile-friendly, and easy to update.

---

## Features

- **Instant Job Search:** Autocomplete job title suggestions as you type.
- **Browse by Sector:** Quickly navigate jobs grouped by sector, with short sector descriptions.
- **Salary Range Comparison:** See min/max salaries per sector and per grade.
- **Salary Calculator:** Estimate your total pay by adding standard and custom allowances.
- **Special Calculators:** Recognition of Service, Night Shift, and Funeral Allowance calculators.
- **Popular & Recent Jobs:** Discover trending and newly added jobs.
- **Persistent Search:** Remembers your last search or sector.
- **Glossary:** Professionally designed About page with definitions of all terms.
- **Mobile-First Design:** Fully responsive layout and touch-friendly navigation.
- **Easy Updates:** All job data, salary scales, sectors, and terms are managed via simple JSON files in `/data`.

---

## Project Structure

```
/data
  job-info.json
  sector.json
  salaries.json
  terms.json
index.html
main.js
style.css
README.md
```

---

## Data Files

- **/data/job-info.json** – Job listings, grades, descriptions, requirements.
- **/data/sector.json** – Sectors, sector descriptions, and job-to-sector mapping.
- **/data/salaries.json** – Salary tables by grade and institution type.
- **/data/terms.json** – Glossary definitions for all terms used in the app.

---

## How to Use

1. **Clone or download** this repository.
2. Ensure all JSON files are in the `data/` folder.
3. Open `index.html` in your browser.
4. Start searching for jobs or browse by sector. Use the About page for definitions.

---

## Updating Data

- **To add/update jobs:** Edit `data/job-info.json`.
- **To update salary scales:** Edit `data/salaries.json`.
- **To change sectors or their descriptions:** Edit `data/sector.json`.
- **To update glossary terms:** Edit `data/terms.json`.

---

## Customization

- **Add more calculators or features** in `main.js`.
- **Update styles** in `style.css` for branding or accessibility.
- **Change the home/branding text** in `index.html`.

---

## License

MIT License.

---

## Credits

- UI inspired by Google search and modern mobile apps.
- Created by [Mondliwethu Moyo].
