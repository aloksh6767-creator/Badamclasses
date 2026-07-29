from pathlib import Path
from PIL import Image


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"

ASSETS = [
    "udaan-combo-batch-2026.png",
    "recorded-batch.jpg",
    "arithmetic-special-batch-2026.png",
    "reasoning-foundation-batch-2026.png",
    "mp-police-batch-banner.png",
    "maths-special-batch-2026.png",
    "ssc-complete-batch-2026.png",
    "phoolbagh-new-batch-2026.png",
    "slider-journey-made-simple.png",
    "slider-journey-made-simple-alt.png",
    "recorded-batch-2-2026.png",
    "mega-test-3-banner.png",
    "railway-batch-banner-new.png",
    "ssc-complete.jpg",
    "slider-railway-batch.png",
    "login-student-study.png",
    "slider-welcome-badamclasses-3x1.png",
    "new-batch-starts-2026.png",
    "signup-learning-illustration.png",
    "slider-new-batch-starts.png",
    "new-logo.png",
    "mock-test-logos/rrb-mock-test.png",
    "mock-test-logos/banker-mock-test.png",
    "mock-test-logos/ssc-mock-test.png",
    "mock-test-logos/police-mock-test.png",
    "mock-test-logos/teaching-mock-test.png",
    "mock-test-logos/state-exam-mock-test.png",
    "success-stories/rohit-singh-akshay-morya-mp-police-si.png",
    "success-stories/akshay-morya-mp-police-si.png",
    "success-stories/shruti-rajawat-rpf-constable.png",
    "success-stories/jayraj-yadav-mp-police-si.png",
]


def optimize(relative_path: str) -> tuple[int, int]:
    source = PUBLIC_DIR / relative_path
    target = source.with_suffix(".webp")
    with Image.open(source) as image:
        image.load()
        converted = image.convert("RGBA" if "A" in image.getbands() else "RGB")
        quality = 90 if source.name == "new-logo.png" else 84
        converted.save(
            target,
            "WEBP",
            quality=quality,
            method=6,
            exact=True,
        )
    return source.stat().st_size, target.stat().st_size


if __name__ == "__main__":
    before = 0
    after = 0
    for asset in ASSETS:
        original_size, optimized_size = optimize(asset)
        before += original_size
        after += optimized_size
        print(
            f"{asset}: {original_size / 1024:.0f} KB -> "
            f"{optimized_size / 1024:.0f} KB"
        )
    print(
        f"Total: {before / 1024 / 1024:.2f} MB -> "
        f"{after / 1024 / 1024:.2f} MB "
        f"({(1 - after / before) * 100:.1f}% reduction)"
    )
