'use client';

import {
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
  ThemeProvider,
  ToastProvider,
} from "@once-ui-system/core";
import { style, dataStyle } from "@/resources/once-ui.config";
import { iconLibrary } from "@/resources/icons";

export function Providers({ children }) {
  return (
    <LayoutProvider>
      <ThemeProvider
        brand={style.brand}
        accent={style.accent}
        neutral={style.neutral}
        solid={style.solid}
        solidStyle={style.solidStyle}
        border={style.border}
        surface={style.surface}
        transition={style.transition}
        scaling={style.scaling}
      >
        <DataThemeProvider
          variant={dataStyle.variant}
          mode={dataStyle.mode}
          height={dataStyle.height}
          axis={{
            stroke: dataStyle.axis.stroke,
          }}
          tick={{
            fill: dataStyle.tick.fill,
            fontSize: dataStyle.tick.fontSize,
            line: dataStyle.tick.line,
          }}
        >
          <ToastProvider>
            <IconProvider icons={iconLibrary}>{children}</IconProvider>
          </ToastProvider>
        </DataThemeProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}

export default Providers;
