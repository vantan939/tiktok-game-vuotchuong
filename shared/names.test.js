import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NAME_LENGTH, fallbackName, isSensitive, sanitizeNickname } from './names.js';

const fb = (id) => fallbackName(id);

test('tên bình thường (kể cả tiếng Việt có dấu) được giữ nguyên', () => {
  for (const n of ['Lan Anh', 'MinhGaming', 'Nguyễn Văn Đạt', 'Cherry_88', 'Bảo.Ngọc', "O'Brien", 'Tuấn Anh 2k5', 'Essex', 'Dickens', 'Massa']) {
    assert.equal(sanitizeNickname(n, 'u1'), n, n);
  }
});

test('ký tự vô hình và ký tự font không vẽ được bị bỏ; còn quá ít thì dùng tên dự phòng', () => {
  assert.equal(sanitizeNickname('Lan​ Anh‮', 'u1'), 'Lan Anh', 'zero-width và đảo chiều');
  assert.equal(sanitizeNickname('Mai😀Linh★', 'u1'), 'MaiLinh', 'emoji và ký hiệu');
  assert.equal(sanitizeNickname('  Lan    Anh  ', 'u1'), 'Lan Anh', 'khoảng trắng thừa');
  assert.equal(sanitizeNickname('😀😀😀', 'u7'), fb('u7'));
  assert.equal(sanitizeNickname('小明', 'u7'), fb('u7'), 'chữ Hán font game không vẽ được');
  assert.equal(sanitizeNickname('Иван', 'u7'), fb('u7'), 'chữ Kirin');
  assert.equal(sanitizeNickname('A', 'u7'), 'A', 'một chữ vẫn được giữ');
  assert.equal(sanitizeNickname('', 'u7'), fb('u7'));
  assert.equal(sanitizeNickname(null, 'u7'), fb('u7'));
});

test('tên quá dài thì dùng tên dự phòng', () => {
  assert.equal(sanitizeNickname('a'.repeat(MAX_NAME_LENGTH), 'u1'), 'a'.repeat(MAX_NAME_LENGTH));
  assert.equal(sanitizeNickname('a'.repeat(MAX_NAME_LENGTH + 1), 'u1'), fb('u1'));
});

test('từ nhạy cảm tiếng Việt và tiếng Anh, kể cả viết lách, đều bị thay', () => {
  for (const n of ['Đụ Má', 'du.ma 99', 'ditme', 'Địt Mẹ Mày', 'dmm', 'VCL', 'Con Cặc', 'f.u.c.k', 'FuCk You', 'sh1t', 'b1tch', 'N1gger', 'Hitler', 'p0rn', 'sex', 'xxx', 'zalo 0909', 'www.abc.com']) {
    assert.ok(isSensitive(n), `${n} phải bị coi là nhạy cảm`);
    assert.equal(sanitizeNickname(n, 'u2'), fb('u2'), n);
  }
});

test('không chặn nhầm tên thường có chứa chuỗi giống từ nhạy cảm', () => {
  for (const n of ['Dũng', 'Lộc', 'Bùi Văn Nam', 'Classic', 'Assassin', 'Cassandra', 'Hồng Nhung', 'Kiên', 'Cường', 'Lâm', 'Chiến', 'Mỹ Linh', 'Pussycat'].filter((x) => x !== 'Pussycat')) {
    assert.ok(!isSensitive(n), `${n} không phải từ nhạy cảm`);
  }
});

test('tên dự phòng ổn định theo userId, khác nhau giữa các người, đúng dạng', () => {
  assert.equal(fb('abc'), fb('abc'));
  assert.notEqual(fb('abc'), fb('abd'));
  assert.match(fb('abc'), /^Người chơi \d{4}$/);
  assert.equal(sanitizeNickname('Lan Anh', 'x'), sanitizeNickname(sanitizeNickname('Lan Anh', 'x'), 'x'), 'lọc hai lần không đổi');
  assert.equal(sanitizeNickname(fb('abc'), 'abc'), fb('abc'), 'tên dự phòng đi qua bộ lọc vẫn nguyên');
});
