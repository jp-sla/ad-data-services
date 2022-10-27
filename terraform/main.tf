resource "aws_s3_bucket" "job_services" {
  bucket = "${local.account}-${local.name}"
  acl = "private"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
