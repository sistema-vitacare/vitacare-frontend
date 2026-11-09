// O jsdom não implementa `matchMedia`, e sem ele o `useMediaQuery` do MUI
// responde sempre "não". Este substituto avalia `min-width` e `max-width`
// contra a largura informada, para testar o layout de computador e o de
// celular.
export function setViewportWidth(width) {
  window.matchMedia = (query) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const matches =
      (!min || width >= Number(min[1])) && (!max || width <= Number(max[1]));
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    };
  };
}

export function resetViewport() {
  delete window.matchMedia;
}
