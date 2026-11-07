/**
 * Build info: the version and the date of the build come from the build itself
 */

import pkg from '../../../package.json';
import { APP_VERSION, BUILD_DATE, formatBuildDate, copyrightYears } from '../../config/buildInfo';

describe('build info', () => {
  test('the version is the one of package.json', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  test('the date of the build is a valid date, not in the future', () => {
    const time = new Date(BUILD_DATE).getTime();

    expect(Number.isNaN(time)).toBe(false);
    expect(time).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  test('the date is written in Italian, with the day in Rome', () => {
    expect(formatBuildDate('2026-11-08T10:00:00.000Z')).toBe('8 novembre 2026');
    // 23:30 UTC of the 8th is already the 9th in Rome
    expect(formatBuildDate('2026-11-08T23:30:00.000Z')).toBe('9 novembre 2026');
  });

  test('a missing or broken date is not shown as "Invalid Date"', () => {
    expect(formatBuildDate(undefined)).toBe('non disponibile');
    expect(formatBuildDate('not a date')).toBe('non disponibile');
  });

  test('the copyright runs from the first year to the year of the build', () => {
    expect(copyrightYears(2026, '2026-11-08T10:00:00.000Z')).toBe('2026');
    expect(copyrightYears(2026, '2027-03-01T10:00:00.000Z')).toBe('2026–2027');
    // 23:30 UTC of 31 December is already the next year in Rome
    expect(copyrightYears(2026, '2026-12-31T23:30:00.000Z')).toBe('2026–2027');
  });

  test('without a date of the build the copyright is the first year, never a past or broken range', () => {
    expect(copyrightYears(2026, undefined)).toBe('2026');
    expect(copyrightYears(2026, 'not a date')).toBe('2026');
    expect(copyrightYears(2026, '2020-01-01T00:00:00.000Z')).toBe('2026');
  });
});
