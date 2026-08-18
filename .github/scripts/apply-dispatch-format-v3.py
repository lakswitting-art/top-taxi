from pathlib import Path

TAG = '<script src="./dispatch-format-v3.js?v=20260819-001"></script>'
INJECT = "    html=html.replace('</body>','<script src=\"./dispatch-format-v3.js?v=20260819-001\"><\\/script></body>');\n"


def insert_tag(path: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if TAG in text:
        return
    if '</body>' not in text:
        raise RuntimeError(f'{path}: </body> not found')
    text = text.replace('</body>', TAG + '\n</body>', 1)
    p.write_text(text, encoding='utf-8')


def inject_loader(path: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if 'dispatch-format-v3.js?v=20260819-001' in text:
        return
    anchor = '    document.open();'
    if path == 'errand-shell-v2.html':
        anchor = '  document.open();'
        inject = INJECT.replace('    html=', '  html=')
    else:
        inject = INJECT
    if anchor not in text:
        raise RuntimeError(f'{path}: document.open anchor not found')
    text = text.replace(anchor, inject + anchor, 1)
    p.write_text(text, encoding='utf-8')


insert_tag('index.html')
insert_tag('fare.html')
inject_loader('ride.html')
inject_loader('errand-shell-v2.html')
