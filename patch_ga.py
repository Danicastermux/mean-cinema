with open('server.js', 'r', encoding='utf-8') as f:
    server = f.read()

ga_tag = """${estilosGlobales}
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GSV5NFGB4H"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-GSV5NFGB4H');
    </script>"""

viejo = "${estilosGlobales}"
cantidad = server.count(viejo)
server = server.replace(viejo, ga_tag)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(server)

print(f"Reemplazos hechos: {cantidad} (deberian ser 2)")
