(async () => {
    const PREFIX = "OpenSearch v";
    const tpl = `
        <style>
        :host {
            display: inline-block;
            position: relative;
            box-sizing: border-box;
            font-size: 1em;
            user-select: none;
            margin: 3px;
        }
        
        * {
            box-sizing: border-box;
        }
        
        #root {
            text-decoration: none;
            color: #FFFFFF;
            background-color: #00509c;
            background-image: var(--normal-bg);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.12);
            border-radius: 4px;
            padding: 0.3em 3em 0.3em 1em;
            margin: 0;
            
            position: relative;
            display: block;
            z-index: 2;
            cursor: pointer;
        }
        
        #root:hover {
            background-image: var(--hover-bg);
        }
        
        #root:focus:hover {
            box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.25);
        }
        
        #root:before {
            content: "";
            position: absolute;
            top: 5px;
            bottom: 5px;
            width: 0;
            border-width: 0 1px;
            border-color: #000 rgba(0, 0, 0, .2) #000 rgba(255, 255, 255, .6);
            right: 2em;
            border-style: solid;
            background-blend-mode: multiply;
        }
        
        #root > svg {
            position: absolute;
            right: .5em;
            top: .6em;
        }
        
        #dropdown {
            position: absolute;
            min-width: calc(100% - 2px);
            top: 100%;
            left: 0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), 0 4px 10px rgba(0, 0, 0, 0.12);
            
            margin: -5px 1px 0 1px;
            padding-top: 5px;
            white-space: nowrap;
            border-radius: 0 0 4px 4px;
            
            background: #fff;
            z-index: 1;
        }
        
        :host(:not([aria-expanded="true"])) #dropdown {
            display: none;
        }
        
        #spacer {
            appearance: none;
            visibility: hidden;
            pointer-events: none;
            height: 0;
            margin: 0 1px;
            overflow: hidden;
        }
        
        #spacer > a,
        #dropdown > a {
            display: block;
            white-space: nowrap;
            padding: 0.3em calc(3em - 1px) 0.3em calc(1em - 1px);
            border-bottom: 1px solid #eee;
            text-decoration: none;
            color: var(--link-color);
        }
        
        #dropdown > a:last-child {
            border: 0;
        }
        
        #dropdown > a:hover {
            background: #efefef;
        }
        </style>
        <a id="root" role="button" aria-labelledby="selected" aria-controls="dropdown" tabindex="0">
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" width="1em" height="1em" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6l6-6"/></g></svg>
          <span id="selected"></span>
        </a>
        <div id="dropdown" role="navigation"></div>
        <div id="spacer" aria-hidden="true"></div>
    `;
    class VersionSelector extends HTMLElement {
        static get observedAttributes() {
            return ['selected'];
        }

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this._onBlur = (e => {
                console.log('Blurring');
                this._expand(false);
                this.removeEventListener('blur', this._onBlur);
            }).bind(this);
        }

        async connectedCallback() {
            const {shadowRoot} = this;
            const frag = this._makeFragment(tpl);

            frag.querySelector('#selected').textContent = `${PREFIX}${this.getAttribute('selected')}`;

            const pathName = location.pathname.replace(/\/docs(\/((latest|\d+\.\d+)\/?)?)?/, '');
            const versionsDOMText = DOC_VERSIONS.map(v => `<a href="/docs/${v}/${pathName}">${PREFIX}${v}</a>`)
                .join('');

            frag.querySelector('#dropdown').appendChild(this._makeFragment(versionsDOMText));
            frag.querySelector('#spacer').appendChild(this._makeFragment(versionsDOMText));

            shadowRoot.appendChild(frag);

            this._instrument(shadowRoot);
        }

        _instrument(shadowRoot) {
            shadowRoot.querySelector('#root').addEventListener('click', e => {
                this._expand(this.getAttribute('aria-expanded') !== 'true');
            });
        }

        _expand(flag) {
            this.setAttribute('aria-expanded', flag);
            if (flag) this.addEventListener('blur', this._onBlur);
        }

        _makeFragment(html) {
            return document.createRange().createContextualFragment(html);
        }
    }
    customElements.define('version-selector', VersionSelector);
})();