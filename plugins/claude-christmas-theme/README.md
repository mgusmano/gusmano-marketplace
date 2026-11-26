# Christmas Eve — a Claude Code theme

A pixel-art Christmas Eve theme for Claude Code. It's drawn as a glyph mosaic: every pixel is a small tile with a character stamped in it. The animated backdrop has:

- Falling snow
- Santa's sleigh and three reindeer flying across the sky. The lead reindeer's red nose blinks.
- A snowy cottage with lights chasing around the roof and glowing windows
- Pine trees, a tile moon, and twinkling stars

It also sets matching colors: midnight blue in dark mode and a snowy morning in light mode.

The backdrop draws in the Claude desktop and mobile apps. Terminals don't show it.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install christmas-eve --marketplace mebessusn/claude-christmas-theme
```

Answer `y` to add the marketplace, then choose the **user** scope so it loads in every session.

From a shell:

```
claude plugin install christmas-eve --marketplace mebessusn/claude-christmas-theme
```

In the desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `mebessusn/claude-christmas-theme`, then **Add plugin**.

## Turn it off

```
claude plugin disable christmas-eve@my-mods
```
