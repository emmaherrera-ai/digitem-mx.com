# DIGITEM-V1.3.3

Iteración de pulido comercial para DIGITEM Suite.

## Cambios

- Se mantiene el flujo: Prospección → Evaluación → Recomendación → Objeciones → Seguimiento.
- Se agregan estados rápidos del pipeline: Pendiente, Aceptó, Evaluado, Recomendado, Seguimiento.
- Se mejora el resumen generado para sonar más consultivo, profesional y listo para copiar.
- Se mantienen botones de copiar en script, recomendación, objeciones y seguimientos.
- El guardado sigue siendo local temporal; Supabase para datos reales queda para V1.4.

## Ejecutar local

```bash
cd ~/Downloads
unzip -o "DIGITEM-V1.3.3.zip"
cd "DIGITEM-V1.3.3"
npm install
npm run dev
```

Abrir:

```text
http://localhost:4321/suite/login
```
