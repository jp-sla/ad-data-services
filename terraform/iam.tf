resource "aws_s3_bucket_public_access_block" "ad_data_services" {
  bucket = aws_s3_bucket.ad_data_services.id

  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
