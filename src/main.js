import m from "mithril";
import data from "json!yaml!data";


const Word = {
  view(ctr, word) {
    return m("div", word.de);
  }
};


const App = {
  view(ctr, data) {
    return m("div",
      m("h1", "Lexique"),
      data.map((word) => m(Word, word))
    );
  }
};

m.mount(document.body, m(App, data));
