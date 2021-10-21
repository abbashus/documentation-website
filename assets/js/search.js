(() => {
    const elInput = document.getElementById('search-input');
    const elResults = document.getElementById('search-results');
    const elOverlay = document.querySelector('.search-overlay');
    if (!elInput || !elResults || !elOverlay) return;

    const canSmoothScroll = 'scrollBehavior' in document.documentElement.style;

    const docsVersion = elInput.getAttribute('data-docs-version');

    let _showingResults = false,
        debounceTimer,
        lastQuery;

    const abortControllers = [];

    elInput.addEventListener('input', e => {
        debounceInput();
    });

    elInput.addEventListener('keydown', e => {
        switch (e.key) {
            case 'Esc':
            case 'Escape':
                hideResults(true);
                elInput.value = '';
                break;

            case 'ArrowUp':
                e.preventDefault();
                highlightNextResult(false);
                break;

            case 'ArrowDown':
                e.preventDefault();
                highlightNextResult();
                break;

            case 'Enter':
                e.preventDefault();
                navToHighlightedResult();
                break;
        }
    });

    elInput.addEventListener('focus', e => {
        if (!_showingResults && elResults.textContent) showResults();
    });

    const debounceInput = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(doSearch, 300);
    };

    function abortPreviousCalls() {
        while (abortControllers.length) abortControllers.pop()?.abort?.();
    }

    const doSearch = async () => {
        const query = elInput.value.replace(/[^a-z0-9-_. ]+/ig, ' ');
        if (query.length < 3) return hideResults(true);
        if (query === lastQuery) return;

        lastQuery = query;

        abortPreviousCalls();

        try {
            const controller = new AbortController();
            abortControllers.unshift(abortControllers);
            const response = await fetch(`https://search-api.opensearch.org/search?q=${query}&v=${docsVersion}`, {signal: controller.signal});
            const data = await response.json();
            if (!Array.isArray(data?.results) || data.results.length === 0) {
                return showNoResults();
            }
            const chunks = data.results.map(result => result
                ? `
                <div class="custom-search-result">
                    <a href="${result.url}">
                        <cite>${result.type === 'DOCS' ? `OpenSearch ${result.version} › ` : ''}${result.ancestors?.join?.(' › ')}</cite>
                        ${result.title}
                    </a>
                    <span>${result.content?.replace?.(/\n/g, '&hellip; ')}</span>
                </div>
                `
                : ''
            );

            emptyResults();
            elResults.appendChild(document.createRange().createContextualFragment(chunks.join('')));
            showResults();
        } catch (ex) {}
    }

    const hideResults = destroy => {
        _showingResults = false;
        document.documentElement.classList.remove('search-active');
        elResults.setAttribute('aria-expanded', 'false');
        document.body.removeEventListener('pointerdown', handlePointerDown, false);

        if (destroy) {
            emptyResults();
            lastQuery = '';
        }
    };

    const showResults = () => {
        elResults.scrollTo(0, 0);

        if (_showingResults) return;

        _showingResults = true;
        document.documentElement.classList.add('search-active');
        elResults.setAttribute('aria-expanded', 'true');
        document.body.addEventListener('pointerdown', handlePointerDown, false);
    };

    const showNoResults = () => {
        emptyResults();
        elResults.appendChild(document.createRange().createContextualFragment('<span>No results found!</span>'));
        showResults();
    };

    const emptyResults = () => {
        //ToDo: Replace with `elResults.replaceChildren();` when https://caniuse.com/?search=replaceChildren shows above 90% can use it
        while (elResults.firstChild) elResults.firstChild.remove();
    };

    const _clean = text => {
        return text?.replace?.(/<.*>/g, '');
    };

    const handlePointerDown = e => {
        if (e.target.matches('.search-input-wrap, .search-input-wrap *, .search-results, .search-results *')) return;

        e.preventDefault();

        elInput.blur();
        hideResults();
    };

    const highlightNextResult = (down = true) => {
        const highlighted = elResults.querySelector('.custom-search-result.highlighted');
        let nextResult;
        if (highlighted) {
            highlighted.classList.remove('highlighted');
            nextResult = highlighted[down ? 'nextElementSibling' : 'previousElementSibling']
        } else {
            nextResult = elResults.querySelector(`.custom-search-result:${down ? 'first' : 'last'}-child`);
        }

        if (nextResult) {
            nextResult.classList.add('highlighted');
            if (down) {
                if (canSmoothScroll) {
                    nextResult.scrollIntoView({behavior: "smooth", block: "end"});
                } else {
                    nextResult.scrollIntoView(false)
                }
            } else if (
                nextResult.offsetTop < elResults.scrollTop ||
                nextResult.offsetTop + nextResult.clientHeight > elResults.scrollTop + elResults.clientHeight
            ) {
                if (canSmoothScroll) {
                    elResults.scrollTo({behavior: "smooth", top: nextResult.offsetTop, left: 0});
                } else {
                    elResults.scrollTo(0, nextResult.offsetTop);
                }
            }
        } else {
            elResults.scrollTo(0, 0);
        }
    };

    const navToHighlightedResult = () => {
        elResults.querySelector('.custom-search-result.highlighted a[href]')?.click?.();
    };
})();