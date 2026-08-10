# static

Internet radio for getting things done.

Static plays live stations from all over the world, with a Focus section of instrumental music curated for working. Every stream in Focus was checked by hand. If a station dies mid song, the app quietly skips to the next one that works.

Station data comes from [Radio Browser](https://www.radio-browser.info), a community run directory. Static filters it down to stations that actually play, and plays music only.

## Running it

You need Node and pnpm.

```
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Keyboard

Space plays and pauses. J and K jump between stations. S shuffles whatever list you are looking at. F saves the current station. Press ? in the app to see the rest.

## Notes

Favourites and recents live in your browser, nothing is stored anywhere else. Track titles are not shown because browsers cannot read them from a live stream. Built with Next.js.
