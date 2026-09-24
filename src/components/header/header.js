import headerHtml from './header.html?raw';

const ACTIVE_CLASSES = ['bg-accent/20', 'text-accent', 'border', 'border-accent/30'];
const INACTIVE_CLASSES = ['text-gray-400', 'hover:text-white', 'hover:bg-gray-800'];

export function mountHeader(container, onTabChange) {
    container.innerHTML = headerHtml;

    const buttons = Array.from(container.querySelectorAll('.tab-btn'));
    const mobileMenuBtn = container.querySelector('#mobile-menu-btn');
    const mobileMenu = container.querySelector('#mobile-menu');

    function fecharMenuMobile() {
        mobileMenu.classList.add('hidden');
        mobileMenu.classList.remove('flex');
    }

    mobileMenuBtn.addEventListener('click', () => {
        const abrindo = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', !abrindo);
        mobileMenu.classList.toggle('flex', abrindo);
    });

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            onTabChange(btn.dataset.tab);
            fecharMenuMobile();
        });
    });

    function setActive(tabId) {
        buttons.forEach((btn) => {
            const isActive = btn.dataset.tab === tabId;
            ACTIVE_CLASSES.forEach((cls) => btn.classList.toggle(cls, isActive));
            INACTIVE_CLASSES.forEach((cls) => btn.classList.toggle(cls, !isActive));
        });
    }

    return { setActive };
}
