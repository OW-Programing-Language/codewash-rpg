package org.codewash.test;

import dev.oreo.RuntimeExtension;
import java.nio.ByteBuffer;
import java.util.List;
import org.lwjgl.BufferUtils;
import static org.lwjgl.opengl.GL33.*;

/** CI-only pixel reader: never included in production graphics classpath. */
public final class FramebufferProbe implements RuntimeExtension {
    @Override public boolean supports(String operation) {
        return "codewash.test.pixel".equals(operation);
    }

    @Override public Object invoke(String operation, List<Object> args) {
        if (!supports(operation)) throw new IllegalArgumentException("Unknown pixel operation");
        if (args.size() != 2 || !(args.get(0) instanceof Integer x) || !(args.get(1) instanceof Integer y))
            throw new IllegalArgumentException("Expected integer X and Y");
        if (x < 0 || x >= 640 || y < 0 || y >= 480)
            throw new IllegalArgumentException("Pixel outside 640x480 frame");
        ByteBuffer pixel = BufferUtils.createByteBuffer(4);
        glFinish();
        glReadBuffer(GL_BACK);
        glReadPixels(x, y, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixel);
        if (glGetError() != GL_NO_ERROR) throw new IllegalStateException("OpenGL read failed");
        return List.of(pixel.get(0) & 255, pixel.get(1) & 255, pixel.get(2) & 255);
    }
}
