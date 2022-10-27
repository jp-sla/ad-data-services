resource "aws_s3_bucket_public_access_block" "job_services" {
  bucket = aws_s3_bucket.job_services.id

  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}
