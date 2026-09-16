/* Qiongye Coordinates: project-authored adapter. SPDX-License-Identifier: AGPL-3.0-only */
#include "swephexp.h"

const char *swe_version_wrap(void) {
  static char version[256];
  return swe_version(version);
}
void swe_set_ephe_path_wrap(const char *path) { swe_set_ephe_path((char *)path); }
int swe_calc_ut_wrap(double jd, int body, int flags, double *values, char *error) {
  return swe_calc_ut(jd, body, flags, values, error);
}
int swe_houses_wrap(double jd, double lat, double lon, int system, double *cusps, double *angles) {
  return swe_houses(jd, lat, lon, system, cusps, angles);
}
double qy_sidereal(double jd) { return swe_sidtime(jd) * 15.0; }
int qy_obliquity(double jd, double *values, char *error) {
  return swe_calc_ut(jd, SE_ECL_NUT, 0, values, error);
}
