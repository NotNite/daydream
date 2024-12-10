# daydream

A proof of concept client mod for the Beeper 4 desktop app.

## Using

In the `app` directory, create a `daydream.mjs`:

```js
const { inject } = await import("file://D:/code/js/daydream/patcher.mjs");
inject(import.meta.filename);
```

Then edit `package.json`:

```json
"main": "daydream.mjs"
```
