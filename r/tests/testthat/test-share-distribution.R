test_that("empty matrix returns zero bins", {
    m <- matrix(integer(0), nrow = 0, ncol = 3)
    expect_equal(item_share_distribution(m), c("1" = 0L, "2" = 0L, "3" = 0L))
})

test_that("3-set matrix counts correctly", {
    m <- matrix(c(
        1, 0, 0,
        1, 1, 0,
        1, 1, 1,
        0, 1, 0,
        1, 0, 1
    ), ncol = 3, byrow = TRUE)
    expect_equal(item_share_distribution(m), c("1" = 2L, "2" = 2L, "3" = 1L))
})

test_that("4-set with zero bins included", {
    m <- matrix(c(
        1, 0, 0, 0,
        0, 0, 1, 0
    ), ncol = 4, byrow = TRUE)
    expect_equal(item_share_distribution(m), c("1" = 2L, "2" = 0L, "3" = 0L, "4" = 0L))
})

test_that("zero rows are skipped", {
    m <- matrix(c(
        1, 0, 0,
        0, 0, 0,
        1, 1, 0
    ), ncol = 3, byrow = TRUE)
    expect_equal(item_share_distribution(m), c("1" = 1L, "2" = 1L, "3" = 0L))
})
