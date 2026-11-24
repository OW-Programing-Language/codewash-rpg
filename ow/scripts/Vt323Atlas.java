// Bake the exact VT323 font used by the Electron UI into a static glyph PNG.
// Source font: Google Fonts / The VT323 Project Authors, SIL OFL 1.1.
// No font shaping library, SVG/browser, fonts or network needed at runtime.
// Invoke: java ow/scripts/Vt323Atlas.java <original ttf> <output png>
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

class Vt323Atlas {
    static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/()=? :.!%'";
    // VT323 is strictly monospace: every glyph advances 13px at 32px. The old
    // 22px cell left 9px (41%) of dead horizontal padding per glyph, which the
    // full-cell UV mapping turned into the wide "L E V E L" inter-letter gaps.
    // A 16px cell hugs the 13px advance (a small sub-pixel margin keeps the
    // anti-aliased edges from bleeding) so native tracking matches Electron.
    static final int COLS = 10, ROWS = 8, CW = 16, CH = 40;
    // Supersample the atlas so each baked glyph carries smooth sub-pixel edge
    // coverage. The GPU shader blends that coverage as alpha, reproducing the
    // Electron VT323 look instead of the previous hard 1-bit glyph mask.
    static final int SS = 4;

    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("font source and output PNG required");
        if (ALPHABET.length() != 76) throw new IllegalStateException("font atlas requires 76 menu glyph codes");
        Font font = Font.createFont(Font.TRUETYPE_FONT, new File(args[0])).deriveFont(Font.PLAIN, 32.0f * SS);
        BufferedImage image = new BufferedImage(COLS * CW * SS, ROWS * CH * SS, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setComposite(AlphaComposite.Src);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
            g.setFont(font);
            g.setColor(Color.WHITE);
            FontMetrics metrics = g.getFontMetrics();
            for (int index = 0; index < ALPHABET.length(); index++) {
                String glyph = ALPHABET.substring(index, index + 1);
                int cx = index % COLS * CW * SS;
                int cy = index / COLS * CH * SS;
                int x = cx + (CW * SS - metrics.stringWidth(glyph)) / 2;
                int y = cy + (CH * SS - metrics.getHeight()) / 2 + metrics.getAscent();
                g.drawString(glyph, x, y);
            }
        } finally {
            g.dispose();
        }
        File target = new File(args[1]);
        File parent = target.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
            throw new IllegalStateException("Cannot create " + parent);
        }
        if (!ImageIO.write(image, "png", target)) {
            throw new IllegalStateException("PNG encoder unavailable");
        }
    }
}
