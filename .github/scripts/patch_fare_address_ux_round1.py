from pathlib import Path

p = Path('fare.html')
s = p.read_text(encoding='utf-8')

old_css = '''.address-suggestions {
    position: absolute;
    top: calc(100% + 7px);
    left: 0;
    right: 0;
    z-index: 5000;
    display: none;
    max-height: min(330px, 46vh);
    overflow-y: auto;
    border: 1px solid #e1e1e4;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 38px rgba(0, 0, 0, .18);
    -webkit-overflow-scrolling: touch;
}'''
new_css = '''.address-suggestions {
    position: absolute;
    top: calc(100% + 7px);
    left: 0;
    right: 0;
    z-index: 5000;
    display: none;
    max-height: min(300px, 44vh);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    touch-action: pan-y;
    scrollbar-width: thin;
    scrollbar-color: rgba(120, 120, 126, .34) transparent;
    border: 1px solid #e1e1e4;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 16px 38px rgba(0, 0, 0, .18);
    -webkit-overflow-scrolling: touch;
}

.address-suggestions::-webkit-scrollbar {
    width: 3px;
}

.address-suggestions::-webkit-scrollbar-track {
    background: transparent;
}

.address-suggestions::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(120, 120, 126, .34);
}'''
if old_css not in s:
    raise SystemExit('Expected address-suggestions CSS block not found')
s = s.replace(old_css, new_css, 1)

old_item = '''.address-suggestion {
    width: 100%;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 14px;
    border: 0;
    border-bottom: 1px solid #ededf0;
    background: #ffffff;
    color: #222222;
    text-align: left;
    cursor: pointer;
}'''
new_item = '''.address-suggestion {
    width: 100%;
    min-height: 64px;
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    align-items: center;
    gap: 11px;
    padding: 13px 14px;
    border: 0;
    border-bottom: 1px solid #ededf0;
    background: #ffffff;
    color: #222222;
    text-align: left;
    cursor: pointer;
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
}'''
if old_item not in s:
    raise SystemExit('Expected address-suggestion CSS block not found')
s = s.replace(old_item, new_item, 1)

old_js = '''                            button.addEventListener(
                                "pointerdown",
                                (event) => {
                                    event.preventDefault();
                                    choosePrediction(
                                        prediction
                                    );
                                }
                            );'''
new_js = '''                            let pointerStartX = 0;
                            let pointerStartY = 0;
                            let pointerMoved = false;

                            button.addEventListener(
                                "pointerdown",
                                (event) => {
                                    pointerStartX = event.clientX;
                                    pointerStartY = event.clientY;
                                    pointerMoved = false;
                                },
                                { passive: true }
                            );

                            button.addEventListener(
                                "pointermove",
                                (event) => {
                                    if (
                                        Math.abs(event.clientX - pointerStartX) > 8
                                        ||
                                        Math.abs(event.clientY - pointerStartY) > 8
                                    ) {
                                        pointerMoved = true;
                                    }
                                },
                                { passive: true }
                            );

                            button.addEventListener(
                                "pointercancel",
                                () => {
                                    pointerMoved = true;
                                },
                                { passive: true }
                            );

                            button.addEventListener(
                                "pointerup",
                                (event) => {
                                    if (pointerMoved) {
                                        return;
                                    }

                                    event.preventDefault();
                                    choosePrediction(
                                        prediction
                                    );
                                }
                            );

                            button.addEventListener(
                                "click",
                                (event) => {
                                    event.preventDefault();
                                    if (event.detail === 0) {
                                        choosePrediction(
                                            prediction
                                        );
                                    }
                                }
                            );'''
if old_js not in s:
    raise SystemExit('Expected suggestion pointer handler not found')
s = s.replace(old_js, new_js, 1)

p.write_text(s, encoding='utf-8')
