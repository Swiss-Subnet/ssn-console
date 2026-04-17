#[macro_export]
macro_rules! define_timer {
    ($mod_name:ident, $timer_fn:path, $log_name:expr, $max_time:expr, $min_time:expr) => {
        mod $mod_name {
            thread_local! {
                static TIMERS: std::cell::Cell<Option<ic_cdk_timers::TimerId>> = const { std::cell::Cell::new(None) };
                static IS_TIMER_RUNNING: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
            }

            struct TimerRunGuard;

            impl TimerRunGuard {
                fn new() -> Result<Self, ()> {
                    if IS_TIMER_RUNNING.with(|f| f.get()) {
                        Err(())
                    } else {
                        IS_TIMER_RUNNING.with(|f| f.replace(true));
                        Ok(TimerRunGuard)
                    }
                }
            }

            impl Drop for TimerRunGuard {
                fn drop(&mut self) {
                    IS_TIMER_RUNNING.with(|f| {
                        f.set(false);
                    });
                }
            }

            pub fn setup_timer() {
                let timer_id = ic_cdk_timers::set_timer(std::time::Duration::from_nanos(0), async {
                    timer_fn().await;
                });
                TIMERS.with(|t| t.set(Some(timer_id)));
            }

            pub fn run_timer() -> Result<(), String> {
                let guard_res = TimerRunGuard::new();
                if guard_res.is_err() {
                    return Err(format!("Timer already in progress. No new timer was triggered for {}.", $log_name));
                }

                TIMERS.with(|t| {
                    if let Some(id) = t.replace(None) {
                        ic_cdk_timers::clear_timer(id);
                    }
                });

                ic_cdk::futures::spawn(async move {
                    let _guard = guard_res;
                    run_timer_and_queue_next().await;
                });

                Ok(())
            }

            async fn timer_fn() {
                let guard_res = TimerRunGuard::new();
                if guard_res.is_err() {
                    ic_cdk::println!("Timer already in progress; skipping this run for {}.", $log_name);
                    return;
                }

                run_timer_and_queue_next().await;
            }

            async fn run_timer_and_queue_next() {
                let current_time_nanos = ic_cdk::api::time();

                if let Err(err) = $timer_fn().await {
                    ic_cdk::println!("Failed to perform {}: {:?}", $log_name, err);
                }

                let end_time_nanos = ic_cdk::api::time();
                let time_diff_nanos = end_time_nanos.saturating_sub(current_time_nanos);

                let next_run_nanos = $max_time
                    .saturating_sub(time_diff_nanos)
                    .max($min_time);

                let timer_id = ic_cdk_timers::set_timer(std::time::Duration::from_nanos(next_run_nanos), async {
                    timer_fn().await;
                });
                TIMERS.with(|t| t.set(Some(timer_id)));
            }
        }

        use $mod_name::{setup_timer, run_timer};
    };
}
