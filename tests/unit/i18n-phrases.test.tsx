// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider, T, useT } from "@/components/i18n/i18n";
import { LANGUAGES } from "@/lib/i18n/languages";
import { phrasesFor, translatePhrase } from "@/lib/i18n/phrases";

function Label() {
  const tx = useT();
  return <span data-testid="label">{tx("{0} questions left", [3])}</span>;
}

afterEach(cleanup);

describe("site-wide translation", () => {
  it("shows English without a provider and translates with one", () => {
    const { rerender } = render(<T s="Free for everyone" />);
    expect(screen.getByText("Free for everyone")).toBeInTheDocument();
    rerender(
      <I18nProvider lang="hi" dict={{ "Free for everyone": "सभी के लिए मुफ़्त" }}>
        <T s="Free for everyone" />
      </I18nProvider>,
    );
    expect(screen.getByText("सभी के लिए मुफ़्त")).toBeInTheDocument();
  });

  it("places links and values where the translation puts {0}, {1}", () => {
    render(
      <I18nProvider lang="hi" dict={{ "Read the {0} and {1}.": "{1} और {0} पढ़ें।" }}>
        <p data-testid="p">
          <T
            s="Read the {0} and {1}."
            v={[
              <a key={0} href="/terms">
                terms
              </a>,
              <b key={1}>privacy</b>,
            ]}
          />
        </p>
      </I18nProvider>,
    );
    expect(screen.getByTestId("p").innerHTML).toBe(
      '<b>privacy</b> और <a href="/terms">terms</a> पढ़ें।',
    );
  });

  it("useT() interpolates", () => {
    render(
      <I18nProvider lang="hi" dict={{ "{0} questions left": "{0} प्रश्न बाकी" }}>
        <Label />
      </I18nProvider>,
    );
    expect(screen.getByTestId("label")).toHaveTextContent("3 प्रश्न बाकी");
  });

  it("has every language file, keeps placeholders, and adds no accuracy claims", () => {
    const hi = phrasesFor("hi");
    expect(Object.keys(hi).length).toBeGreaterThan(800);
    for (const { code } of LANGUAGES.filter((l) => l.code !== "en")) {
      const dict = phrasesFor(code);
      // New text is English until `npm run i18n:translate` runs; most must be translated.
      expect(Object.keys(dict).length).toBeGreaterThan(800);
      for (const [en, tr] of Object.entries(dict)) {
        const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
        expect(ph(tr), `${code}: ${en}`).toBe(ph(en));
      }
    }
    expect(translatePhrase("hi", "Not a known phrase")).toBe("Not a known phrase");
  });
});
