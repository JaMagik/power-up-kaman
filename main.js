// main.js - Power-Up (działa w iframe Power-Upa Trello)

TrelloPowerUp.initialize({
  'card-buttons': function(t, options) {
    return [{
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document-plus.svg',
      text: 'Generuj ofertę Kaman',
      callback: function(t) {
        return t.card('id', 'name')
          .then(function(card) {
            // Otwórz popup do Twojej aplikacji generującej PDF
            const url = `https://kaman-oferty.vercel.app/?trelloCardId=${card.id}`;
            return t.popup({
              title: 'Generator Ofert Kaman',
              url: url,
              height: 750
            });
          });
      }
    }];
  },



  // GŁÓWNA logika – attach PDF do karty
  'attachment-sections': function(t, options) {
    return [{
      claimed: [],
      icon: 'https://cdn.jsdelivr.net/npm/heroicons/outline/document.svg',
      title: 'Oferty Kaman',
      content: {
        type: 'iframe',
        url: t.signUrl('./attachment-section.html'),
        height: 800,
        width: 800
      }
    }];
  }
});

// Funkcja wywoływana z Twojej aplikacji po wygenerowaniu PDF
window.addEventListener('message', async (event) => {
  const { pdfUrl, pdfName } = event.data;

  if (pdfUrl && pdfName) {
    const t = window.TrelloPowerUp.iframe();

    await t.attach({
      url: pdfUrl,
      name: pdfName,
      mimeType: 'application/pdf'
    });

    alert('Oferta zapisana na karcie Trello!');
    t.closePopup();
  }
});
