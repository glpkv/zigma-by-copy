"""Use one Belarus phone format in static and dynamically generated forms."""
from pathlib import Path
from bs4 import BeautifulSoup
root = Path(__file__).resolve().parents[1]
for page in (root / 'public').rglob('*.html'):
    text = page.read_text().replace('"li_masktype":"a"', '"li_masktype":""')
    soup = BeautifulSoup(text, 'html.parser')
    dialog = soup.select_one('dialog#appointment-dialog')
    if dialog:
        dialog.replace_with(BeautifulSoup((root/'scripts/appointment-dialog.html').read_text(), 'html.parser'))
    if not soup.select_one('script[src="/phone-input.js"]'):
        soup.head.append(soup.new_tag('script', src='/phone-input.js', defer=''))
    for field in soup.select('input[type="tel"]'):
        field['placeholder'] = '+375 (29) 123-45-67'
    page.write_text(str(soup))
