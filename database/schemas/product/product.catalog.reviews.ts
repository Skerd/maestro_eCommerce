/**
 * One custom purchase review per catalog product (`seedKey`).
 * Consumed by `productReview.defaults.ts` (requires a delivered order).
 */

export type CatalogProductReviewSeed = {
    rating: number;
    title: string;
    comment: string;
};

export const catalogProductReviews: Readonly<Record<string, CatalogProductReviewSeed>> = {
    "prod-wd-01-wrap-midi": {
        rating: 3,
        title: "Wrap Midi Dress: worth it",
        comment: "Flowing wrap dress with a tie waist and midi hem. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wd-02-floral-sundress": {
        rating: 4,
        title: "Second order of the Floral Sundress",
        comment: "Light cotton sundress in a ditsy floral print. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wd-03-little-black": {
        rating: 5,
        title: "Little Black Dress: worth it",
        comment: "Timeless black sheath dress for evenings out. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-wd-04-boho-maxi": {
        rating: 4,
        title: "Great quality Boho Maxi Dress",
        comment: "Tiered maxi dress with a relaxed bohemian cut. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wd-05-beach-maxi": {
        rating: 3,
        title: "Great quality White Beach Maxi Dress",
        comment: "Airy white cotton maxi dress for the beach and beyond. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wd-06-satin-slip": {
        rating: 5,
        title: "Second order of the Satin Slip Dress",
        comment: "Bias-cut satin slip dress with fine straps. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-wd-07-evening-gown": {
        rating: 5,
        title: "Happy with the Evening Gown",
        comment: "Floor-length gown for galas and weddings. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wd-08-red-cocktail": {
        rating: 4,
        title: "Red Satin Cocktail Dress: worth it",
        comment: "Red satin dress with a fluid skirt for parties. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wt-01-silk-blouse": {
        rating: 4,
        title: "Second order of the Silk Blouse",
        comment: "Washable silk blouse with a soft drape. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wt-02-white-tee": {
        rating: 5,
        title: "Love the Organic White Tee",
        comment: "Everyday organic cotton t-shirt. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-wt-03-breton": {
        rating: 4,
        title: "Second order of the Breton Striped Top",
        comment: "Navy and white striped long-sleeve top. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wt-04-ruffle-blouse": {
        rating: 3,
        title: "Ruffle Collar Blouse fits beautifully",
        comment: "Romantic blouse with a ruffled collar. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-wt-05-linen-shirt": {
        rating: 5,
        title: "Love the Relaxed Linen Shirt",
        comment: "Oversized linen shirt for warm weather. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wt-06-tank": {
        rating: 3,
        title: "Second order of the Ribbed Tank Top",
        comment: "Stretch ribbed tank for layering. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wt-07-off-shoulder": {
        rating: 5,
        title: "Off-Shoulder Top: worth it",
        comment: "Bardot top with an elasticated neckline. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wt-08-cashmere-sweater": {
        rating: 5,
        title: "Cashmere Crew Sweater: worth it",
        comment: "Pure cashmere crew-neck sweater. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wb-01-wide-leg": {
        rating: 5,
        title: "Wide-Leg Trousers fits beautifully",
        comment: "High-waisted wide-leg tailored trousers. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wb-02-high-rise-jeans": {
        rating: 4,
        title: "Great quality High-Rise Straight Jeans",
        comment: "Rigid denim with a high rise and straight leg. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-wb-03-pleated-skirt": {
        rating: 4,
        title: "Pleated Midi Skirt: worth it",
        comment: "Sunray-pleated midi skirt that moves with you. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-wb-04-denim-skirt": {
        rating: 5,
        title: "Denim Mini Skirt fits beautifully",
        comment: "Five-pocket denim mini skirt. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wb-05-tailored-shorts": {
        rating: 5,
        title: "Happy with the Tailored Shorts",
        comment: "Pleat-front tailored shorts. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wb-06-cargo": {
        rating: 3,
        title: "Second order of the Utility Cargo Pants",
        comment: "Relaxed cargo pants with patch pockets. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wb-07-linen-trousers": {
        rating: 3,
        title: "Linen Drawstring Trousers: worth it",
        comment: "Breezy linen trousers with a drawstring waist. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wb-08-leather-skirt": {
        rating: 4,
        title: "Happy with the Faux Leather Skirt",
        comment: "A-line skirt in soft faux leather. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wo-01-trench": {
        rating: 5,
        title: "Happy with the Classic Trench Coat",
        comment: "Double-breasted cotton trench with a belt. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-wo-02-wool-coat": {
        rating: 4,
        title: "Wool Wrap Coat: worth it",
        comment: "Belted wrap coat in a warm wool blend. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-wo-03-biker": {
        rating: 3,
        title: "Leather Biker Jacket after a month",
        comment: "Asymmetric-zip leather biker jacket. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-wo-04-puffer": {
        rating: 3,
        title: "Happy with the Cropped Puffer Jacket",
        comment: "Lightweight insulated cropped puffer. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wo-05-blazer": {
        rating: 5,
        title: "Happy with the Tailored Blazer",
        comment: "Single-breasted blazer with sharp shoulders. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-wo-06-denim-jacket": {
        rating: 5,
        title: "Better than the photos",
        comment: "Washed denim jacket with a cropped fit. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-wo-07-cardigan": {
        rating: 4,
        title: "Second order of the Chunky Knit Cardigan",
        comment: "Cosy chunky-knit cardigan with horn buttons. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-wo-08-pantsuit": {
        rating: 4,
        title: "Happy with the Two-Piece Pantsuit",
        comment: "Matching blazer and trousers, sold as a set. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-ms-01-oxford": {
        rating: 4,
        title: "Oxford Button-Down Shirt after a month",
        comment: "Classic Oxford cotton button-down. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-ms-02-linen": {
        rating: 5,
        title: "Better than the photos",
        comment: "Breathable linen shirt for hot days. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-ms-03-flannel": {
        rating: 3,
        title: "Love the Flannel Check Shirt",
        comment: "Brushed flannel shirt in a bold check. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-ms-04-denim": {
        rating: 4,
        title: "Second order of the Western Denim Shirt",
        comment: "Chambray denim shirt with snap buttons. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-ms-05-dress-shirt": {
        rating: 5,
        title: "White Dress Shirt after a month",
        comment: "Crisp poplin shirt for suits and ties. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-ms-06-printed": {
        rating: 5,
        title: "Happy with the Printed Resort Shirt",
        comment: "Short-sleeve camp-collar shirt with a bold print. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-ms-07-polo": {
        rating: 5,
        title: "Piqué Polo Shirt: worth it",
        comment: "Cotton piqué polo with a ribbed collar. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-ms-08-overshirt": {
        rating: 5,
        title: "Better than the photos",
        comment: "Heavy wool-blend overshirt with chest pockets. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-01-brand-tee": {
        rating: 5,
        title: "Love the Essential Crew T-Shirt",
        comment: "Midweight cotton crew tee in every size and colour. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-02-hoodie": {
        rating: 3,
        title: "Heavyweight Hoodie fits beautifully",
        comment: "Brushed fleece hoodie with a kangaroo pocket. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-mk-03-sweatshirt": {
        rating: 3,
        title: "Crewneck Sweatshirt: worth it",
        comment: "Loopback cotton crewneck sweatshirt. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-mk-04-henley": {
        rating: 4,
        title: "Long-Sleeve Henley fits beautifully",
        comment: "Waffle-knit henley with a three-button placket. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-mk-05-graphic-tee": {
        rating: 3,
        title: "Happy with the Graphic Print Tee",
        comment: "Soft tee with a screen-printed graphic. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-mk-06-merino": {
        rating: 3,
        title: "Great quality Merino V-Neck Sweater",
        comment: "Fine merino wool V-neck sweater. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-mk-07-turtleneck": {
        rating: 3,
        title: "Fine-Knit Turtleneck: worth it",
        comment: "Slim roll-neck in fine-gauge wool. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-mk-08-cable-knit": {
        rating: 4,
        title: "Cable-Knit Sweater: worth it",
        comment: "Chunky cable-knit sweater in an oatmeal wool blend. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-mt-01-chino": {
        rating: 5,
        title: "Great quality Slim Stretch Chinos",
        comment: "Tapered chinos in stretch cotton twill. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-mt-02-jeans": {
        rating: 4,
        title: "Great quality Slim Selvedge Jeans",
        comment: "Raw selvedge denim with a slim leg. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-mt-03-white-trousers": {
        rating: 5,
        title: "Love the White Summer Trousers",
        comment: "Relaxed white cotton trousers for warm evenings. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-mt-04-linen-shorts": {
        rating: 3,
        title: "Happy with the Linen Shorts",
        comment: "Drawstring linen shorts for summer. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-mt-05-joggers": {
        rating: 5,
        title: "Love the Fleece Joggers",
        comment: "Cuffed fleece joggers for travel and rest days. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-mt-06-wool-trousers": {
        rating: 3,
        title: "Happy with the Wool Pleated Trousers",
        comment: "Single-pleat trousers in fine wool. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-mt-07-straight-jeans": {
        rating: 4,
        title: "Straight-Leg Jeans after a month",
        comment: "Mid-wash straight-leg jeans with a cropped hem. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-mt-08-corduroy": {
        rating: 5,
        title: "Happy with the Corduroy Trousers",
        comment: "Wide-wale corduroy trousers. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-su-01-navy": {
        rating: 5,
        title: "Happy with the Navy Two-Piece Suit",
        comment: "Navy wool suit with a two-button jacket. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-su-02-charcoal": {
        rating: 5,
        title: "Happy with the Charcoal Wool Suit",
        comment: "Charcoal suit for the office and beyond. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-su-03-tuxedo": {
        rating: 5,
        title: "Love the Black Tuxedo",
        comment: "Satin-lapel tuxedo for black-tie events. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-su-04-linen-suit": {
        rating: 4,
        title: "Happy with the Beige Linen Suit",
        comment: "Unlined linen suit for summer weddings. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-su-05-blazer": {
        rating: 3,
        title: "Great quality Unstructured Blazer",
        comment: "Soft-shoulder blazer to wear with jeans or chinos. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-su-06-waistcoat": {
        rating: 4,
        title: "Second order of the Tweed Waistcoat",
        comment: "Five-button tweed waistcoat. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-su-07-silk-tie": {
        rating: 5,
        title: "Happy with the Silk Tie",
        comment: "Hand-finished silk tie. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-su-08-three-piece": {
        rating: 4,
        title: "Love the Three-Piece Check Suit",
        comment: "Checked jacket, waistcoat and trousers. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-mo-01-bomber": {
        rating: 5,
        title: "Second order of the Nylon Bomber Jacket",
        comment: "Classic flight bomber in water-resistant nylon. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-mo-02-parka": {
        rating: 3,
        title: "Great quality Hooded Winter Parka",
        comment: "Insulated parka with a hood for real winters. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-mo-03-overcoat": {
        rating: 5,
        title: "Wool Overcoat: worth it",
        comment: "Knee-length overcoat in a wool blend. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-mo-04-leather": {
        rating: 3,
        title: "Second order of the Leather Jacket",
        comment: "Lambskin leather jacket that ages well. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-mo-05-puffer-vest": {
        rating: 5,
        title: "Love the Puffer Vest",
        comment: "Packable down-alternative vest. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-mo-06-rain": {
        rating: 4,
        title: "Second order of the Packable Rain Jacket",
        comment: "Waterproof shell that folds into its pocket. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-mo-07-field": {
        rating: 5,
        title: "Better than the photos",
        comment: "Four-pocket cotton field jacket. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-mo-08-denim-jacket": {
        rating: 5,
        title: "Second order of the Trucker Denim Jacket",
        comment: "Rigid denim trucker jacket. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-kd-01-party-dress": {
        rating: 3,
        title: "Better than the photos",
        comment: "Tulle party dress for birthdays and weddings. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-kd-02-tee": {
        rating: 5,
        title: "Kids' Cotton Tee after a month",
        comment: "Soft printed tee for everyday play. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-kd-03-hoodie": {
        rating: 4,
        title: "Happy with the Kids' Zip Hoodie",
        comment: "Zip-up hoodie with a cosy lining. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-kd-04-jeans": {
        rating: 3,
        title: "Great quality Kids' Stretch Jeans",
        comment: "Stretch denim with an adjustable waist. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-kd-05-rain-jacket": {
        rating: 4,
        title: "Better than the photos",
        comment: "Bright waterproof jacket with a hood. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-kd-06-pajamas": {
        rating: 5,
        title: "Happy with the Kids' Pajama Set",
        comment: "Two-piece cotton pajamas. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-kd-07-costume": {
        rating: 4,
        title: "Kids' Dress-Up Costume fits beautifully",
        comment: "Dress-up costume for parties and carnival. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-kd-08-sneakers": {
        rating: 4,
        title: "Kids' Sneakers fits beautifully",
        comment: "Easy-on sneakers with a grippy sole. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-sh-01-white-sneakers": {
        rating: 4,
        title: "White Leather Sneakers fits beautifully",
        comment: "Minimal white leather sneakers. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-sh-02-running": {
        rating: 4,
        title: "Great quality Road Running Shoes",
        comment: "Cushioned running shoes for daily miles. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-sh-03-chelsea": {
        rating: 4,
        title: "Chelsea Boots fits beautifully",
        comment: "Suede Chelsea boots with elastic sides. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-sh-04-pumps": {
        rating: 3,
        title: "Pointed Pumps: worth it",
        comment: "Pointed-toe pumps with a mid heel. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-sh-05-loafers": {
        rating: 4,
        title: "Leather Loafers fits beautifully",
        comment: "Penny loafers in polished leather. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-sh-06-sandals": {
        rating: 4,
        title: "Happy with the Strappy Sandals",
        comment: "Flat strappy leather sandals. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-sh-07-espadrilles": {
        rating: 5,
        title: "Great quality Suede Espadrilles",
        comment: "Suede espadrilles with a braided jute sole. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-sh-08-derby": {
        rating: 3,
        title: "Second order of the Derby Dress Shoes",
        comment: "Leather derby shoes for suits. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-bg-01-tote": {
        rating: 4,
        title: "Love the Leather Tote Bag",
        comment: "Roomy leather tote for work and weekends. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-bg-02-crossbody": {
        rating: 4,
        title: "Mini Crossbody Bag fits beautifully",
        comment: "Compact crossbody with an adjustable strap. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-bg-03-backpack": {
        rating: 5,
        title: "Great quality Canvas Backpack",
        comment: "Waxed canvas backpack with leather trims. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-bg-04-clutch": {
        rating: 3,
        title: "Better than the photos",
        comment: "Small evening clutch with a chain strap. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-bg-05-weekender": {
        rating: 5,
        title: "Love the Weekender Duffel",
        comment: "Canvas and leather weekend bag. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-bg-06-belt-bag": {
        rating: 4,
        title: "Belt Bag fits beautifully",
        comment: "Hands-free belt bag worn at the waist or across the chest. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-bg-07-shoulder": {
        rating: 3,
        title: "Great quality Leather Shoulder Bag",
        comment: "Structured leather shoulder bag. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-bg-08-wallet": {
        rating: 5,
        title: "Great quality Leather Wallet",
        comment: "Slim bifold wallet in full-grain leather. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-ac-01-belt": {
        rating: 3,
        title: "Great quality Leather Belt",
        comment: "Full-grain leather belt with a brass buckle. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-ac-02-silk-scarf": {
        rating: 5,
        title: "Love the Silk Scarf",
        comment: "Printed silk twill scarf. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-ac-03-beanie": {
        rating: 5,
        title: "Ribbed Wool Beanie: worth it",
        comment: "Warm ribbed beanie in merino wool. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-ac-04-cap": {
        rating: 5,
        title: "Cotton Baseball Cap after a month",
        comment: "Six-panel cotton cap. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-ac-05-sunglasses": {
        rating: 3,
        title: "Love the Round Sunglasses",
        comment: "Round sunglasses with UV400 lenses. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-ac-06-earrings": {
        rating: 4,
        title: "Gold Hoop Earrings after a month",
        comment: "Gold-plated hoop earrings. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-ac-07-necklace": {
        rating: 3,
        title: "Love the Pendant Necklace",
        comment: "Fine chain necklace with a pendant. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-ac-08-fedora": {
        rating: 5,
        title: "Wool Fedora Hat fits beautifully",
        comment: "Wool felt fedora with a grosgrain band. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-sl-01-cotton-robe": {
        rating: 5,
        title: "Great quality Cotton Lounge Robe",
        comment: "Soft brushed-cotton robe with a shawl collar. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-sl-02-robe": {
        rating: 5,
        title: "Better than the photos",
        comment: "Light waffle-weave cotton robe. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-sl-03-socks": {
        rating: 3,
        title: "Better than the photos",
        comment: "Five pairs of soft cotton socks. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-sl-04-slippers": {
        rating: 5,
        title: "Second order of the Shearling Slippers",
        comment: "Warm slippers lined with shearling. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-sl-05-lounge-set": {
        rating: 5,
        title: "Knit Lounge Set after a month",
        comment: "Matching knit polo and trousers for the sofa. Wore it to a wedding and got compliments all evening. Washed well too, no shrinking.",
    },
    "prod-sl-06-moccasins": {
        rating: 5,
        title: "Love the Suede House Moccasins",
        comment: "Soft suede moccasins with a cushioned sole. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-sl-07-silk-pajamas": {
        rating: 5,
        title: "Great quality Silk Pajama Set",
        comment: "Mulberry silk pajama set. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-sl-08-kimono-robe": {
        rating: 5,
        title: "Satin Kimono Robe: worth it",
        comment: "Champagne satin kimono robe with a tie belt. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-as-01-leggings": {
        rating: 3,
        title: "Happy with the High-Waist Training Leggings",
        comment: "Squat-proof leggings with a side pocket. Slightly roomy, so size down if you are between sizes. Otherwise perfect.",
    },
    "prod-as-02-sports-bra": {
        rating: 4,
        title: "Better than the photos",
        comment: "Medium-support bra for gym and running. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-as-03-track-jacket": {
        rating: 4,
        title: "Love the Colour-Block Track Jacket",
        comment: "Retro colour-block jacket with a stand collar. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-as-04-running-shorts": {
        rating: 5,
        title: "Running Shorts after a month",
        comment: "Light running shorts with a liner. Good everyday piece; it goes with everything in my wardrobe.",
    },
    "prod-as-05-swimsuit": {
        rating: 4,
        title: "One-Piece Swimsuit: worth it",
        comment: "Classic scoop-back one-piece swimsuit. Bought it as a gift and it was a hit. Easy exchange for a different size, too.",
    },
    "prod-as-06-swim-shorts": {
        rating: 3,
        title: "Great quality Swim Shorts",
        comment: "Quick-dry swim shorts with a mesh lining. The fabric feels lovely and the colour is exactly as shown. Fits true to size — I took my usual size.",
    },
    "prod-as-07-training-tee": {
        rating: 5,
        title: "Happy with the Dry-Fit Training Tee",
        comment: "Sweat-wicking training t-shirt. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-as-08-windbreaker": {
        rating: 5,
        title: "Second order of the Lightweight Windbreaker",
        comment: "Packable windbreaker for runs and hikes. Arrived quickly, well packed. The stitching is neat and it already feels like a favourite.",
    },
    "prod-03-logo-pack": {
        rating: 5,
        title: "Better than the photos",
        comment: "Downloadable guide to a ten-piece capsule wardrobe. Clear, practical and easy to follow — I rebuilt my wardrobe around it.",
    },
    "prod-dg-02-styling-session": {
        rating: 5,
        title: "Great quality Online Styling Session",
        comment: "A 45-minute video call with one of our stylists. Clear, practical and easy to follow — I rebuilt my wardrobe around it.",
    },
    "prod-gc-01-25": {
        rating: 5,
        title: "Great quality gift card",
        comment: "Sent it for a birthday; the email arrived straight away and spending it at checkout was easy.",
    },
    "prod-gc-02-50": {
        rating: 5,
        title: "Happy with the gift card",
        comment: "Sent it for a birthday; the email arrived straight away and spending it at checkout was easy.",
    },
    "prod-gc-03-100": {
        rating: 5,
        title: "Happy with the gift card",
        comment: "Sent it for a birthday; the email arrived straight away and spending it at checkout was easy.",
    },
    "prod-gc-04-150": {
        rating: 4,
        title: "Better than the photos",
        comment: "Sent it for a birthday; the email arrived straight away and spending it at checkout was easy.",
    },
    "prod-gc-05-250": {
        rating: 5,
        title: "Love the gift card",
        comment: "Sent it for a birthday; the email arrived straight away and spending it at checkout was easy.",
    },
    "prod-bundle-01-studio-apparel": {
        rating: 5,
        title: "Weekend Essentials Set: worth it",
        comment: "Crew tee and heavyweight hoodie, together. Everything matched and arrived together. Saved me a lot of thinking.",
    },
    "prod-bundle-02-office-look": {
        rating: 4,
        title: "Love the Office Look",
        comment: "Oxford shirt, slim chinos and a leather belt. Everything matched and arrived together. Saved me a lot of thinking.",
    },
    "prod-bundle-03-wedding-guest": {
        rating: 5,
        title: "Better than the photos",
        comment: "Satin slip dress, evening clutch and gold hoops. Everything matched and arrived together. Saved me a lot of thinking.",
    },
    "prod-bundle-04-beach-holiday": {
        rating: 5,
        title: "Love the Beach Holiday Set",
        comment: "Swimsuit, strappy sandals and round sunglasses. Everything matched and arrived together. Saved me a lot of thinking.",
    },
    "prod-bundle-05-back-to-school": {
        rating: 5,
        title: "Great quality Back to School Set",
        comment: "Kids' tee, stretch jeans and a canvas backpack. Everything matched and arrived together. Saved me a lot of thinking.",
    },
};
