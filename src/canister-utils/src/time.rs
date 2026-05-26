// Non-wasm fallback exists so unit tests don't panic on `ic_cdk::api::time()`.
pub fn now_nanos() -> u64 {
    #[cfg(target_family = "wasm")]
    return ic_cdk::api::time();
    #[cfg(not(target_family = "wasm"))]
    0
}

pub fn get_current_year(days_since_epoch: u64) -> (u64, u64) {
    let mut days_since_epoch = days_since_epoch;
    let mut year = 1970;

    loop {
        let is_leap = is_leap_year(year);
        let days_in_year = if is_leap { 366 } else { 365 };

        if days_since_epoch >= days_in_year {
            days_since_epoch -= days_in_year;
            year += 1;
        } else {
            break;
        }
    }

    (year, days_since_epoch)
}

pub fn get_current_month(current_year: u64, days_since_year_start: u64) -> u64 {
    let mut days_since_year_start = days_since_year_start;

    let is_leap = is_leap_year(current_year);
    let days_in_month = [
        31,                            // Jan
        if is_leap { 29 } else { 28 }, // Feb
        31,                            // Mar
        30,                            // Apr
        31,                            // May
        30,                            // Jun
        31,                            // Jul
        31,                            // Aug
        30,                            // Sep
        31,                            // Oct
        30,                            // Nov
        31,                            // Dec
    ];

    let mut month = 1;
    for &dim in days_in_month.iter() {
        if days_since_year_start >= dim {
            days_since_year_start -= dim;
            month += 1;
        } else {
            break;
        }
    }

    month
}

fn is_leap_year(year: u64) -> bool {
    (year.is_multiple_of(4) && !year.is_multiple_of(100)) || year.is_multiple_of(400)
}
