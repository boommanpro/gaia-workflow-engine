(function () {
  mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'strict', flowchart: { useMaxWidth: true, htmlLabels: false } });
  document.getElementById('print').addEventListener('click', function () {
    document.querySelectorAll('details').forEach(function (item) { item.open = true; });
    window.print();
  });
})();
