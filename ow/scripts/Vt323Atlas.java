// Bake the exact VT323 font used by the Electron UI into a static glyph PNG.
// Source font: Google Fonts / The VT323 Project Authors, SIL OFL 1.1.
// No font shaping library, SVG/browser, fonts or network needed at runtime.
// Invoke: java ow/scripts/Vt323Atlas.java <original ttf> <output png>
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import javax.imageio.ImageIO;

class Vt323Atlas {
    static final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/()=? :.!%";
    static final int COLS = 8, ROWS = 7, CW = 24, CH = 32;

    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("font source and output PNG required");
        if (ALPHABET.length() != 49) throw new IllegalStateException("font atlas requires 49 legacy glyph codes");
        Font font = Font.createFont(Font.TRUETYPE_FONT, new File(args[0])).deriveFont(Font.PLAIN, 28.0f);
        BufferedImage image = new BufferedImage(COLS * CW, ROWS * CH, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setComposite(AlphaComposite.Src);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_OFF);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_OFF);
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_OFF);
            g.setFont(font);
            g.setColor(Color.WHITE);
            FontMetrics metrics = g.getFontMetrics();
            for (int index = 0; index < ALPHABET.length(); index++) {
                String glyph = ALPHABET.substring(index, index + 1);
                int cx = index % COLS * CW;
                int cy = index / COLS * CH;
                int x = cx + (CW - metrics.stringWidth(glyph)) / 2;
                int y = cy + (CH - metrics.getHeight()) / 2 + metrics.getAscent();
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
