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
  }
});

// Odbiór PDF z Twojej aplikacji (po wygenerowaniu PDF)
window.addEventListener('message', async (event) => {
  const { pdfUrl, pdfName } = event.data;

  if (pdfUrl && pdfName) {
    const t = window.TrelloPowerUp.iframe();

    try {
      await t.attach({
        url: pdfUrl,
        name: pdfName,
        mimeType: 'application/pdf'
      });

      alert('Oferta została zapisana na karcie Trello!');
      t.closePopup();
    } catch (err) {
      console.error('Błąd podczas zapisywania PDF w Trello:', err);
      alert('Błąd zapisu do Trello.');
    }
  }
});
