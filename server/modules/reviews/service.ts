export interface Review {
  orderId: string;
  rating: number;
  comment: string;
}

const mockReviews: Review[] = [];

export function getReviewsForListing(listingId: string): Review[] {
  return mockReviews;
}

export function createReview(orderId: string, rating: number, comment: string): Review {
  const review: Review = { orderId, rating, comment };
  mockReviews.push(review);
  return review;
}
