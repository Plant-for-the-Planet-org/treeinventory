var assert = require('assert');

describe('Search Wikipedia Functionality', () => {
  it('can find search results', async () => {
    var searchSelector = await $(`~btn_register_trees`);
    await searchSelector.waitForDisplayed({ timeout: 30000 });
    await searchSelector.click();

    var insertTextSelector = await $(
      'android=new UiSelector().resourceId("org.wikipedia.alpha:id/search_src_text")',
    );
    await insertTextSelector.waitForDisplayed({ timeout: 30000 });

    await insertTextSelector.addValue('Browsertack');
    await browser.pause(5000);

    var allProductsName = await $$(`android.widget.TextView`);
    assert(allProductsName.length > 0);
  });
});

describe('Running a sample test', () => {
  beforeAll(() => {
    $('~app-root').waitForDisplayed(11000, false);
  });

  it('Should navigate to register trees', () => {
    $('~btn_register_trees').click();
  });

  it('Should navigate to register trees', () => {
    $('~btn_rt_continue').click();
  });

  it('Should navigate to register trees', () => {
    $('~tree_map_marking_btn').click();
  });
});
