// script.js - Interaktív funkciók az új Pohánka & Társa weboldalhoz

document.addEventListener('DOMContentLoaded', () => {

    // Mobil menü kezelése
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        });
    }

    // Gördülékeny scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // SZEKVENCIÁLIS "BEÚSZÓ" ANIMÁCIÓK
    const animatedSections = document.querySelectorAll('.animated-section');

    const sectionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const section = entry.target;
                const elementsToAnimate = section.querySelectorAll('.anim-el');
                
                elementsToAnimate.forEach((el, index) => {
                    // A késleltetés az index alapján nő, így jön létre a szekvenciális hatás
                    el.style.transitionDelay = `${index * 150}ms`;
                    el.classList.add('is-visible');
                });

                observer.unobserve(section); // Animáció csak egyszer fusson le
            }
        });
    }, { threshold: 0.1 });

    animatedSections.forEach(section => {
        sectionObserver.observe(section);
    });

    // INTERAKTÍV, MEGFORDÍTHATÓ KÁRTYÁK
    const flippableCards = document.querySelectorAll('.flippable-card');
    flippableCards.forEach(card => {
        card.addEventListener('click', () => {
            card.classList.toggle('is-flipped');
        });
    });


    console.log("Pohánka & Társa Kft. - Új weboldal inicializálva, fejlett animációk aktívak.");

});
