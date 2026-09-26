const GPS_FRESHNESS_MS =
  2 * 60 * 1000;

function getDriverGpsStatus(
  driver,
  now = Date.now()
) {
  const hasValidCoordinates =
    Number.isFinite(driver?.latitude) &&
    Number.isFinite(driver?.longitude);

  if (!hasValidCoordinates) {
    return "UNAVAILABLE";
  }

  const lastLocationAt =
    driver?.lastLocationAt instanceof Date
      ? driver.lastLocationAt
      : driver?.lastLocationAt
        ? new Date(driver.lastLocationAt)
        : null;

  if (
    !lastLocationAt ||
    Number.isNaN(lastLocationAt.getTime())
  ) {
    return "UNAVAILABLE";
  }

  const locationAgeMs =
    now - lastLocationAt.getTime();

  if (
    locationAgeMs >= 0 &&
    locationAgeMs <= GPS_FRESHNESS_MS
  ) {
    return "FRESH";
  }

  return "STALE";
}

function hasFreshDriverLocation(
  delivery,
  now = Date.now()
) {
  return (
    delivery?.status ===
      "OUT_FOR_DELIVERY" &&
    getDriverGpsStatus(
      delivery?.driver,
      now
    ) === "FRESH"
  );
}

module.exports = {
  GPS_FRESHNESS_MS,
  getDriverGpsStatus,
  hasFreshDriverLocation
};
