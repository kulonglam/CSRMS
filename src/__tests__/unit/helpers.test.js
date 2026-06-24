const { parsePagination, paginationMeta } = require('../../utils/helpers');

describe('parsePagination', () => {
  test('uses defaults when page/limit omitted', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 50, offset: 0 });
  });

  test('parses page and limit', () => {
    expect(parsePagination({ page: '2', limit: '25' })).toEqual({ page: 2, limit: 25, offset: 25 });
  });

  test('caps limit at maxLimit', () => {
    expect(parsePagination({ limit: '999' }, { maxLimit: 200 }).limit).toBe(200);
  });

  test('paginationMeta computes total pages', () => {
    expect(paginationMeta(2, 50, 120)).toEqual({
      page: 2,
      limit: 50,
      total: 120,
      total_pages: 3,
    });
  });
});
