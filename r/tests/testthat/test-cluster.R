test_that("average linkage produces expected leaf order and heights", {
    D <- matrix(c(
        0.00, 0.20, 0.90, 0.80,
        0.20, 0.00, 0.85, 0.75,
        0.90, 0.85, 0.00, 0.10,
        0.80, 0.75, 0.10, 0.00
    ), nrow = 4, byrow = TRUE)
    co <- cluster_set_order(D, linkage = "average")
    expect_equal(co$leaf_order, c(1L, 2L, 3L, 4L))
    expect_equal(co$merges$height[1], 0.10)
    expect_true(abs(co$merges$height[3] - 0.825) < 1e-9)
})

test_that("complete linkage final height", {
    D <- matrix(c(
        0.00, 0.20, 0.90, 0.80,
        0.20, 0.00, 0.85, 0.75,
        0.90, 0.85, 0.00, 0.10,
        0.80, 0.75, 0.10, 0.00
    ), nrow = 4, byrow = TRUE)
    co <- cluster_set_order(D, linkage = "complete")
    expect_equal(co$merges$height[3], 0.90)
})

test_that("single linkage final height", {
    D <- matrix(c(
        0.00, 0.20, 0.90, 0.80,
        0.20, 0.00, 0.85, 0.75,
        0.90, 0.85, 0.00, 0.10,
        0.80, 0.75, 0.10, 0.00
    ), nrow = 4, byrow = TRUE)
    co <- cluster_set_order(D, linkage = "single")
    expect_equal(co$merges$height[3], 0.75)
})

test_that("N=2 single merge", {
    D <- matrix(c(0.0, 0.5, 0.5, 0.0), nrow = 2)
    co <- cluster_set_order(D, linkage = "average")
    expect_equal(co$leaf_order, c(1L, 2L))
    expect_equal(nrow(co$merges), 1L)
    expect_equal(co$merges$height[1], 0.5)
})
